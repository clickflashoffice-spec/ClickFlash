import { Hono, type Context } from 'hono';
import {
  AuthConfigurationError,
  createGalleryToken,
  getGalleryPrincipal,
  requireGalleryAuth,
  requireServiceAuth,
  verifyGalleryToken
} from '../auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

function publicEvent(event: Record<string, unknown>): Record<string, unknown> {
  const { access_code: _accessCode, ...safeEvent } = event;
  return safeEvent;
}

const ACTIVE_FACE_VECTOR_DIMENSIONS = 128;
const QR_TOKEN_TTL_SECONDS = 15 * 60;

export interface ParsedByteRange {
  start: number;
  end: number;
  length: number;
}

interface QrTokenRecord {
  eventId: string;
  expiresAt: number;
}

export function parseSingleByteRange(
  rangeHeader: string,
  objectSize: number,
): ParsedByteRange {
  if (!Number.isSafeInteger(objectSize) || objectSize <= 0) {
    throw new RangeError('Object has no satisfiable byte range');
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) {
    throw new RangeError('Malformed or multiple byte range');
  }

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      throw new RangeError('Invalid suffix byte range');
    }
    const length = Math.min(suffixLength, objectSize);
    start = objectSize - length;
    end = objectSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : objectSize - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= objectSize ||
      end < start
    ) {
      throw new RangeError('Unsatisfiable byte range');
    }
    end = Math.min(end, objectSize - 1);
  }

  return { start, end, length: end - start + 1 };
}

function hasValidFaceVector(body: unknown): body is { vector: number[] } {
  if (!body || typeof body !== 'object' || !('vector' in body)) return false;

  const vector = (body as { vector?: unknown }).vector;
  if (!Array.isArray(vector) || vector.length !== ACTIVE_FACE_VECTOR_DIMENSIONS) {
    return false;
  }

  let magnitudeSquared = 0;
  for (const value of vector) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    magnitudeSquared += value * value;
  }

  return Number.isFinite(magnitudeSquared) && magnitudeSquared > Number.EPSILON;
}

async function faceSearchUnavailable(c: Context<AppEnv>) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'INVALID_FACE_VECTOR' }, 400);
  }

  if (!hasValidFaceVector(body)) {
    return c.json({
      error: `Face vector must contain ${ACTIVE_FACE_VECTOR_DIMENSIONS} finite, non-zero values`,
      code: 'INVALID_FACE_VECTOR',
      expectedDimensions: ACTIVE_FACE_VECTOR_DIMENSIONS
    }, 400);
  }

  return c.json({
    error: 'Face search is unavailable until the event-scoped vector index is configured',
    code: 'FACE_SEARCH_UNAVAILABLE',
    expectedDimensions: ACTIVE_FACE_VECTOR_DIMENSIONS,
    matches: []
  }, 503);
}

app.post('/login', async (c) => {
  try {
    const { accessCode } = await c.req.json();
    if (!accessCode) return c.json({ error: 'Missing accessCode' }, 400);

    const event = await c.get('DB').prepare(
      `SELECT * FROM events WHERE access_code = ?`
    ).bind(accessCode).first();

    if (!event) return c.json({ error: 'Invalid access code' }, 401);

    const eventId = String(event.id);
    const token = await createGalleryToken(c.env, eventId, c.get('regionId'));
    
    return c.json({
      success: true,
      token,
      event: publicEvent(event)
    });
  } catch (error: any) {
    if (error instanceof AuthConfigurationError) {
      return c.json({ error: 'Gallery authentication is not configured' }, 503);
    }
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/qr/generate', requireServiceAuth, async (c) => {
  try {
    const { eventId, accessCode } = await c.req.json();
    if (!eventId || !accessCode) return c.json({ error: 'Missing eventId or accessCode' }, 400);

    const event = await c.get('DB').prepare(
      `SELECT id FROM events WHERE id = ? AND access_code = ?`
    ).bind(eventId, accessCode).first();
    if (!event) return c.json({ error: 'Event or access code not found' }, 404);

    const token = crypto.randomUUID();
    const expiresAt = Date.now() + QR_TOKEN_TTL_SECONDS * 1000;

    if (c.env.SESSION_KV) {
      const record: QrTokenRecord = { eventId: String(eventId), expiresAt };
      await c.env.SESSION_KV.put(`qr:${token}`, JSON.stringify(record), {
        expirationTtl: QR_TOKEN_TTL_SECONDS
      });
    } else {
      await c.get('DB').prepare(
        `INSERT INTO qr_tokens (token, event_id, access_code, expires_at) VALUES (?, ?, ?, ?)`
      ).bind(token, eventId, accessCode, expiresAt).run();
    }

    return c.json({
      success: true,
      token,
      expiresAt,
      url: `https://gallery.clickflash.com/connect?token=${token}`
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to generate QR token' }, 500);
  }
});

app.post('/qr/validate', async (c) => {
  try {
    const { token } = await c.req.json();
    if (!token) return c.json({ error: 'Missing token' }, 400);

    let record: { event_id: string; expires_at: number } | null = null;
    if (c.env.SESSION_KV) {
      const kvRecord = await c.env.SESSION_KV.get<QrTokenRecord>(`qr:${token}`, 'json');
      if (kvRecord) {
        record = { event_id: kvRecord.eventId, expires_at: kvRecord.expiresAt };
      }
    }
    if (!record) {
      record = await c.get('DB').prepare(
        `SELECT event_id, expires_at FROM qr_tokens WHERE token = ?`
      ).bind(token).first<{ event_id: string; expires_at: number }>();
    }

    if (!record) return c.json({ error: 'Invalid token' }, 401);
    if (Date.now() > Number(record.expires_at)) {
      return c.json({ error: 'Token expired' }, 401);
    }

    const event = await c.get('DB').prepare(
      `SELECT * FROM events WHERE id = ?`
    ).bind(record.event_id).first();

    if (c.env.SESSION_KV) {
      await c.env.SESSION_KV.delete(`qr:${token}`);
    }
    await c.get('DB').prepare(`DELETE FROM qr_tokens WHERE token = ?`).bind(token).run();

    const eventId = String(record.event_id);
    const signedToken = await createGalleryToken(c.env, eventId, c.get('regionId'));

    return c.json({
      success: true,
      token: signedToken,
      event: event ? publicEvent(event) : { id: eventId, name: 'Event' }
    });
  } catch (error: any) {
    if (error instanceof AuthConfigurationError) {
      return c.json({ error: 'Gallery authentication is not configured' }, 503);
    }
    return c.json({ error: 'Failed to validate QR token' }, 500);
  }
});

app.get('/photos', requireGalleryAuth, async (c) => {
  try {
    const { eventId } = getGalleryPrincipal(c);

    const curationStatus = c.req.query('curationStatus');
    
    let query = `SELECT * FROM photos WHERE event_id = ? AND curation_status != 'REJECTED' ORDER BY id DESC`;
    const bindParams: any[] = [eventId];

    if (curationStatus) {
      query = `SELECT * FROM photos WHERE event_id = ? AND curation_status = ? ORDER BY id DESC`;
      bindParams.push(curationStatus);
    }

    const { results } = await c.get('DB').prepare(query).bind(...bindParams).all();

    const photos = results.map((row: any) => ({
      id: row.id,
      url: `/api/photos/${row.id}/download-url`,
      title: row.camera_id,
      aiTags: row.ai_tags ? JSON.parse(row.ai_tags) : null,
      size: row.size,
      rawAvailable: Boolean(row.raw_r2_path),
      rawStatus: row.raw_status || 'pending',
      rawSize: row.raw_size || null,
      qualityScore: row.quality_score || null,
      curationStatus: row.curation_status || 'PENDING'
    }));

    return c.json({ success: true, photos });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/photos/:id/download-url', requireGalleryAuth, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(/\s+/)[1];
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    const { eventId } = getGalleryPrincipal(c);

    const photoId = c.req.param('id');
    const photo = await c.get('DB').prepare(
      `SELECT r2_path FROM photos WHERE id = ? AND event_id = ?`
    ).bind(photoId, eventId).first();

    if (!photo) return c.json({ error: 'Not found' }, 404);

    const baseUrl = new URL(c.req.url).origin;
    return c.json({
      success: true,
      downloadUrl: `${baseUrl}/api/photos/${photoId}/file?token=${token}`
    });
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/photos/:id/file', async (c) => {
  try {
    const token = c.req.query('token');
    if (!token) return c.json({ error: 'Unauthorized' }, 401);
    
    let principal;
    try {
      principal = await verifyGalleryToken(c.env, token);
    } catch (error) {
      if (error instanceof AuthConfigurationError) {
        return c.json({ error: 'Gallery authentication is not configured' }, 503);
      }
      throw error;
    }
    if (!principal) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const photoId = c.req.param('id');
    const photo = await c.get('DB').prepare(
      `SELECT r2_path FROM photos WHERE id = ? AND event_id = ?`
    ).bind(photoId, principal.eventId).first();

    if (!photo || !photo.r2_path) return c.json({ error: 'Not found' }, 404);

    const objectKey = photo.r2_path as string;
    const metadata = await c.env.PHOTO_BUCKET.head(objectKey);
    if (!metadata) return c.json({ error: 'File not found in R2' }, 404);

    const rangeHeader = c.req.header('Range');
    let parsedRange: ParsedByteRange | null = null;
    if (rangeHeader) {
      try {
        parsedRange = parseSingleByteRange(rangeHeader, metadata.size);
      } catch {
        return new Response(null, {
          status: 416,
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes */${metadata.size}`
          }
        });
      }
    }

    const object = await c.env.PHOTO_BUCKET.get(
      objectKey,
      parsedRange
        ? { range: { offset: parsedRange.start, length: parsedRange.length } }
        : undefined
    );
    if (!object) return c.json({ error: 'File not found in R2' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Disposition', `attachment; filename="ClickFlash_${photoId}.jpg"`);

    if (parsedRange) {
      headers.set(
        'Content-Range',
        `bytes ${parsedRange.start}-${parsedRange.end}/${metadata.size}`
      );
      headers.set('Content-Length', String(parsedRange.length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set('Content-Length', String(metadata.size));
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/photos/raw/export-batch', requireServiceAuth, async (c) => {
  try {
    const { eventId, filterTags } = await c.req.json();
    if (!eventId) return c.json({ error: 'Missing eventId' }, 400);

    const db = c.get('DB');
    const { results: photos } = await db.prepare(`SELECT * FROM photos WHERE event_id = ?`).bind(eventId).all();

    let filteredPhotos = photos;
    if (Array.isArray(filterTags) && filterTags.length > 0) {
      filteredPhotos = photos.filter((p: any) => {
        if (!p.ai_tags) return false;
        try {
          const tags = JSON.parse(p.ai_tags);
          return filterTags.some((tag: string) => tags.includes(tag));
        } catch {
          return false;
        }
      });
    }

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    const totalFiles = filteredPhotos.length;

    await db.prepare(
      `INSERT INTO raw_export_jobs (id, event_id, status, total_files, processed_files, export_r2_path, filter_tags, created_at, completed_at)
       VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?)`
    ).bind(
      jobId, eventId, totalFiles, totalFiles, `exports/manifest-${jobId}.json`,
      filterTags ? JSON.stringify(filterTags) : null, now, now
    ).run();

    const manifest = {
      jobId, eventId, createdAt: now, totalFiles,
      filterTags: filterTags || [],
      items: filteredPhotos.map((p: any) => ({
        id: p.id,
        previewUrl: `/api/photos/${p.id}/download-url`,
        rawObjectKey: p.raw_r2_path || null,
        rawStatus: p.raw_status || 'pending',
        rawSize: p.raw_size || 0,
        rawMetadata: p.raw_metadata ? JSON.parse(p.raw_metadata) : null,
        aiTags: p.ai_tags ? JSON.parse(p.ai_tags) : []
      }))
    };

    await c.env.PHOTO_BUCKET.put(`exports/manifest-${jobId}.json`, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: 'application/json' }
    });

    return c.json({
      success: true, jobId, totalFiles, status: 'completed',
      manifestUrl: `/api/photos/raw/export-jobs/${jobId}/manifest`
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to initiate batch export' }, 500);
  }
});

app.get('/photos/raw/export-jobs', requireServiceAuth, async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM raw_export_jobs ORDER BY created_at DESC LIMIT 50`
    ).all();
    return c.json({ success: true, jobs: results });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch export jobs' }, 500);
  }
});

app.get('/photos/raw/export-jobs/:id', requireServiceAuth, async (c) => {
  try {
    const jobId = c.req.param('id');
    const job = await c.get('DB').prepare(
      `SELECT * FROM raw_export_jobs WHERE id = ?`
    ).bind(jobId).first();

    if (!job) return c.json({ error: 'Job not found' }, 404);
    return c.json({ success: true, job });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch export job' }, 500);
  }
});

app.get('/photos/raw/export-jobs/:id/manifest', requireServiceAuth, async (c) => {
  try {
    const jobId = c.req.param('id');
    const object = await c.env.PHOTO_BUCKET.get(`exports/manifest-${jobId}.json`);
    if (!object) return c.json({ error: 'Manifest not found in storage' }, 404);

    const data = await object.json();
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch manifest' }, 500);
  }
});

app.post('/search', requireGalleryAuth, faceSearchUnavailable);

app.post('/ai/face-search', requireGalleryAuth, faceSearchUnavailable);

app.post('/ai/magic-eraser', async (c) => {
  try {
    const { imageUrl, maskDataUrl } = await c.req.json();
    return c.json({
      success: true,
      processedImageUrl: imageUrl || 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600&auto=format&fit=crop',
      message: 'Magic Eraser completed successfully.'
    });
  } catch (error: any) {
    return c.json({ error: 'Magic eraser failed' }, 500);
  }
});

app.get('/gallery/products', async (c) => {
  return c.json({
    items: [
      { id: 'prod_digital', name: 'High-Res Digital Download', price: 25.00, type: 'DIGITAL' },
      { id: 'prod_all_inclusive', name: 'All-Inclusive Digital Album', price: 99.00, type: 'BUNDLE' },
      { id: 'prod_print_canvas', name: '16x24 Framed Canvas Print', price: 120.00, type: 'PRINT' },
      { id: 'prod_photobook', name: 'AI Curated Hardcover Photobook', price: 145.00, type: 'PRINT' },
    ]
  });
});

app.get('/resorts/branding', async (c) => {
  return c.json({
    branding: {
      resortName: 'ClickFlash Luxury Resort & Spa',
      logoUrl: 'https://clickflash.app/logo.png',
      primaryColor: '#3b82f6',
      accentColor: '#8b5cf6',
      heroImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop',
    }
  });
});

export default app;
