import { Hono } from 'hono';
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
    const expiresAt = Date.now() + 15 * 60 * 1000; 

    await c.get('DB').prepare(
      `INSERT INTO qr_tokens (token, event_id, access_code, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(token, eventId, accessCode, expiresAt).run();

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

    const record = await c.get('DB').prepare(
      `SELECT * FROM qr_tokens WHERE token = ?`
    ).bind(token).first();

    if (!record) return c.json({ error: 'Invalid token' }, 401);
    if (Date.now() > Number(record.expires_at)) {
      return c.json({ error: 'Token expired' }, 401);
    }

    const event = await c.get('DB').prepare(
      `SELECT * FROM events WHERE id = ?`
    ).bind(record.event_id).first();

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

    const object = await c.env.PHOTO_BUCKET.get(photo.r2_path as string);
    if (!object) return c.json({ error: 'File not found in R2' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Disposition', `attachment; filename="ClickFlash_${photoId}.jpg"`);

    return new Response(object.body, { headers });
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

export default app;
