import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/sync/up', async (c) => {
  try {
    const { deskId, payloads } = await c.req.json();
    if (!deskId || !payloads) return c.json({ error: 'Missing deskId or payloads' }, 400);

    const db = c.get('DB');
    const statements: D1PreparedStatement[] = [];

    if (payloads.sessions && Array.isArray(payloads.sessions)) {
      const stmt = db.prepare(
        `INSERT INTO sessions (id, resort_id, photographer_id, guest_name, status, sync_status, customer_email, customer_phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
           status=excluded.status, sync_status=excluded.sync_status,
           customer_email=excluded.customer_email, customer_phone=excluded.customer_phone`
      );
      for (const session of payloads.sessions) {
        statements.push(stmt.bind(
          session.id, session.resortId || 'RESORT_01', session.photographerId || null, 
          session.guestName || 'Guest', session.status || 'ACTIVE', 'SYNCED',
          session.customerEmail || null, session.customerPhone || null, 
          session.createdAt || new Date().toISOString()
        ));
      }
    }

    if (payloads.transactions && Array.isArray(payloads.transactions)) {
      const stmt = db.prepare(
        `INSERT INTO transactions (id, session_id, stripe_payment_intent_id, amount, currency, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status=excluded.status`
      );
      for (const tx of payloads.transactions) {
        statements.push(stmt.bind(
          tx.id, tx.sessionId, tx.stripePaymentIntentId || null, 
          tx.amount, tx.currency || 'EUR', tx.status || 'COMPLETED',
          tx.createdAt || new Date().toISOString()
        ));
      }
    }

    if (payloads.shifts && Array.isArray(payloads.shifts)) {
      const stmt = db.prepare(
        `INSERT INTO shifts (id, photographer_id, type, timestamp, latitude, longitude, station_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`
      );
      for (const shift of payloads.shifts) {
        statements.push(stmt.bind(
          shift.id, shift.photographerId, shift.type, shift.timestamp,
          shift.latitude || null, shift.longitude || null, shift.stationId || deskId
        ));
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return c.json({ success: true, message: `Up-sync completed. Processed ${statements.length} records.` });
  } catch (error: any) {
    return c.json({ error: 'Up-sync failed' }, 500);
  }
});

app.post('/sync/down', async (c) => {
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

app.post('/sessions/sync', async (c) => {
  try {
    const { sessions } = await c.req.json();
    if (!Array.isArray(sessions)) return c.json({ error: 'Expected array of sessions' }, 400);

    const stmt = c.get('DB').prepare(
      `INSERT INTO sessions (id, resort_id, photographer_id, guest_name, status, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status, sync_status='SYNCED'`
    );

    const batch = sessions.map(s => stmt.bind(
      s.id, s.resortId, s.photographerId, s.guestName, s.status, 'SYNCED', s.createdAt || Date.now()
    ));

    await c.get('DB').batch(batch);
    
    return c.json({ success: true, syncedCount: sessions.length });
  } catch (error: any) {
    return c.json({ error: 'Session sync failed' }, 500);
  }
});

export default app;
