import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/', async (c) => {
  try {
    const formData = await c.req.parseBody();
    
    const file = formData['photo'] as File;
    const eventName = formData['eventName'] as string;
    const accessCode = formData['accessCode'] as string;
    const cameraId = (formData['cameraId'] as string) || 'unknown';

    if (!file || !eventName || !accessCode) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const eventId = eventName.toLowerCase().replace(/\s+/g, '-');
    await c.get('DB').prepare(
      `INSERT INTO events (id, name, access_code) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING`
    ).bind(eventId, eventName, accessCode).run();

    const photoId = crypto.randomUUID();
    const r2Path = `events/${eventId}/${photoId}.jpg`;
    
    await c.env.PHOTO_BUCKET.put(r2Path, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    });

    const rawFile = formData['rawPhoto'] as File | undefined;
    const rawMetadata = (formData['rawMetadata'] as string) || null;
    let rawR2Path: string | null = null;
    let rawSize: number | null = null;
    let rawStatus = 'pending';

    if (rawFile) {
      const ext = rawFile.name ? rawFile.name.split('.').pop()?.toLowerCase() || 'raw' : 'raw';
      rawR2Path = `events/${eventId}/${photoId}.${ext}`;
      await c.env.PHOTO_BUCKET.put(rawR2Path, await rawFile.arrayBuffer(), {
        httpMetadata: { contentType: rawFile.type || 'application/octet-stream' }
      });
      rawSize = rawFile.size;
      rawStatus = 'uploaded';
    }

    await c.get('DB').prepare(
      `INSERT INTO photos (id, event_id, r2_path, size, camera_id, raw_r2_path, raw_size, raw_status, raw_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(photoId, eventId, r2Path, file.size, cameraId, rawR2Path, rawSize, rawStatus, rawMetadata).run();

    const regionId = c.req.header('X-Region-ID') || c.req.query('region_id') || 'MENA';
    await c.env.AI_TAGGER_QUEUE.send({ photoId, r2Path, mimeType: file.type || 'image/jpeg', regionId });

    return c.json({ 
      success: true, 
      photoId, 
      path: r2Path 
    });

  } catch (error: any) {
    // Error logged to structured logging
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
