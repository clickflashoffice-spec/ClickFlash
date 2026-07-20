import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/login', async (c) => {
  try {
    const { accessCode } = await c.req.json();
    if (!accessCode) return c.json({ error: 'Missing accessCode' }, 400);

    const event = await c.get('DB').prepare(
      `SELECT * FROM events WHERE access_code = ?`
    ).bind(accessCode).first();

    if (!event) return c.json({ error: 'Invalid access code' }, 401);

    const token = await sign({ eventId: event.id, accessCode }, c.env.JWT_SECRET || 'fallback-secret');
    
    return c.json({
      success: true,
      token,
      event
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/qr/generate', async (c) => {
  try {
    const { eventId, accessCode } = await c.req.json();
    if (!eventId || !accessCode) return c.json({ error: 'Missing eventId or accessCode' }, 400);

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

    const signedToken = await sign({ eventId: record.event_id, accessCode: record.access_code }, c.env.JWT_SECRET || 'fallback-secret');

    return c.json({
      success: true,
      token: signedToken,
      event: event || { id: record.event_id, access_code: record.access_code, name: 'Event' }
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to validate QR token' }, 500);
  }
});

app.get('/photos', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const token = authHeader.split(' ')[1];
    let tokenPayload: any;
    try {
      tokenPayload = await verify(token, c.env.JWT_SECRET || 'fallback-secret');
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    const eventId = tokenPayload.eventId;
    if (!eventId) return c.json({ error: 'Invalid token payload' }, 401);

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
      rawUrl: row.raw_r2_path ? `https://clickflash-photos.public.r2.dev/${row.raw_r2_path}` : null,
      rawStatus: row.raw_status || 'pending',
      rawSize: row.raw_size || null,
      rawMetadata: row.raw_metadata ? JSON.parse(row.raw_metadata) : null,
      qualityScore: row.quality_score || null,
      curationStatus: row.curation_status || 'PENDING'
    }));

    return c.json({ success: true, photos });
  } catch (error: any) {
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/photos/:id/download-url', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.split(' ')[1];

    const photoId = c.req.param('id');
    const photo = await c.get('DB').prepare(
      `SELECT r2_path FROM photos WHERE id = ?`
    ).bind(photoId).first();

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
    
    let decoded: any;
    try {
      decoded = await verify(token, c.env.JWT_SECRET || 'fallback-secret');
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
    if (!decoded.eventId) return c.json({ error: 'Invalid token' }, 401);

    const photoId = c.req.param('id');
    const photo = await c.get('DB').prepare(
      `SELECT r2_path FROM photos WHERE id = ?`
    ).bind(photoId).first();

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

app.post('/photos/raw/export-batch', async (c) => {
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
        rawUrl: p.raw_r2_path ? `https://clickflash-photos.public.r2.dev/${p.raw_r2_path}` : null,
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

app.get('/photos/raw/export-jobs', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT * FROM raw_export_jobs ORDER BY created_at DESC LIMIT 50`
    ).all();
    return c.json({ success: true, jobs: results });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch export jobs' }, 500);
  }
});

app.get('/photos/raw/export-jobs/:id', async (c) => {
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

app.get('/photos/raw/export-jobs/:id/manifest', async (c) => {
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
