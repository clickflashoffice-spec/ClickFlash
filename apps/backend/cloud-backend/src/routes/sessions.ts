import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';
import { Redis } from '@upstash/redis/cloudflare';

const app = new Hono<AppEnv>();

// The stream key used to mimic enterprise Kafka for offline sync events
const SYNC_STREAM_KEY = 'clickflash:events:sync';

app.post('/sync/up', requireServiceAuth, async (c) => {
  try {
    const { deskId, payloads } = await c.req.json();
    if (!deskId || !payloads) return c.json({ error: 'Missing deskId or payloads' }, 400);

    const redisUrl = c.env.UPSTASH_REDIS_REST_URL;
    const redisToken = c.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      return c.json({ error: 'Redis configuration is missing' }, 500);
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const eventsToPush: any[] = [];

    if (payloads.sessions && Array.isArray(payloads.sessions)) {
      for (const session of payloads.sessions) {
        eventsToPush.push({
          type: 'SESSION_SYNC',
          deskId,
          payload: JSON.stringify(session)
        });
      }
    }

    if (payloads.transactions && Array.isArray(payloads.transactions)) {
      for (const tx of payloads.transactions) {
        eventsToPush.push({
          type: 'TRANSACTION_SYNC',
          deskId,
          payload: JSON.stringify(tx)
        });
      }
    }

    if (payloads.shifts && Array.isArray(payloads.shifts)) {
      for (const shift of payloads.shifts) {
        eventsToPush.push({
          type: 'SHIFT_SYNC',
          deskId,
          payload: JSON.stringify(shift)
        });
      }
    }

    // Publish events to Redis Streams
    for (const event of eventsToPush) {
      // Use XADD to add an entry to the stream
      await redis.xadd(SYNC_STREAM_KEY, '*', event);
    }

    return c.json({ success: true, message: `Up-sync queued via Redis Streams. Processed ${eventsToPush.length} events.` });
  } catch (error: any) {
    return c.json({ error: 'Up-sync failed: ' + error.message }, 500);
  }
});

app.post('/sync/down', requireServiceAuth, async (c) => {
  // Keeping down sync as DB reads since it needs the latest materialized view
  try {
    const { deskId, lastSyncTimestamp } = await c.req.json();
    if (!deskId) return c.json({ error: 'Missing deskId' }, 400);

    const db = c.get('DB');
    const timestamp = lastSyncTimestamp || '1970-01-01T00:00:00Z';

    const [bookingsRes, packsRes, rostersRes] = await db.batch([
      db.prepare(`SELECT * FROM bookings WHERE updated_at >= ?`).bind(timestamp),
      db.prepare(`SELECT * FROM packs WHERE updated_at >= ?`).bind(timestamp),
      db.prepare(`SELECT * FROM rosters WHERE updated_at >= ? AND station_id = ?`).bind(timestamp, deskId)
    ]);

    return c.json({
      success: true,
      bookings: bookingsRes.results || [],
      packs: packsRes.results || [],
      rosters: rostersRes.results || [],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return c.json({ error: 'Down-sync failed' }, 500);
  }
});

app.post('/sessions/sync', requireServiceAuth, async (c) => {
  try {
    const { sessions } = await c.req.json();
    if (!sessions || !Array.isArray(sessions)) {
      return c.json({ error: 'Invalid sessions array' }, 400);
    }

    const redisUrl = c.env.UPSTASH_REDIS_REST_URL;
    const redisToken = c.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      return c.json({ error: 'Redis configuration is missing' }, 500);
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    for (const session of sessions) {
        await redis.xadd(SYNC_STREAM_KEY, '*', {
            type: 'SESSION_SYNC_BULK',
            payload: JSON.stringify(session)
        });
    }

    return c.json({ success: true, message: `Queued ${sessions.length} sessions via Redis Streams` });
  } catch (error: any) {
    return c.json({ error: 'Session bulk sync failed: ' + error.message }, 500);
  }
});

export default app;
