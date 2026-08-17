import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/**
 * Initialize a direct R2 upload session for freelance external photographers
 */
app.post('/init', async (c) => {
  try {
    const { eventName, accessCode, photographerId, totalFiles, wristbandId } = await c.req.json();

    if (!eventName || !accessCode) {
      return c.json({ error: 'eventName and accessCode are required' }, 400);
    }

    const eventId = eventName.toLowerCase().replace(/\s+/g, '-');
    const sessionId = crypto.randomUUID();

    // Ensure event exists in regional D1
    await c.get('DB').prepare(
      `INSERT INTO events (id, name, access_code) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING`
    ).bind(eventId, eventName, accessCode).run();

    return c.json({
      success: true,
      sessionId,
      eventId,
      accessCode,
      photographerId: photographerId || 'freelance_pro',
      wristbandId: wristbandId || null,
      r2BaseFolder: `events/${eventId}`,
      message: 'Direct R2 upload session initialized',
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to initialize photographer upload session', details: error.message }, 500);
  }
});

/**
 * Finalize an individual photo upload from the web uploader
 */
app.post('/finalize', async (c) => {
  try {
    const { photoId, eventId, r2Path, fileSize, sharpnessScore, photographerId, wristbandId } = await c.req.json();

    if (!photoId || !eventId || !r2Path) {
      return c.json({ error: 'Missing required photo metadata' }, 400);
    }

    // Insert record in D1 photos table
    await c.get('DB').prepare(
      `INSERT INTO photos (id, event_id, r2_path, size, camera_id) VALUES (?, ?, ?, ?, ?)`
    ).bind(photoId, eventId, r2Path, fileSize || 0, photographerId || 'freelance').run();

    // Queue for Cloudflare AI tagging
    const regionId = c.req.header('X-Region-ID') || 'MENA';
    await c.env.AI_TAGGER_QUEUE.send({
      photoId,
      r2Path,
      mimeType: 'image/jpeg',
      regionId,
      sharpnessScore: sharpnessScore || 85,
      wristbandId: wristbandId || null,
    });

    return c.json({
      success: true,
      photoId,
      message: 'Photo registered and queued for AI indexing',
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to finalize photo upload', details: error.message }, 500);
  }
});

export default app;
