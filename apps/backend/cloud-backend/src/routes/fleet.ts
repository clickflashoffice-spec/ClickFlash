import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();
app.use('*', requireServiceAuth);

app.post('/masters/heartbeat', async (c) => {
  try {
    const payload = await c.req.json();
    const { masterId, name, version, metrics, status, sales } = payload;
    
    if (!masterId) return c.json({ error: 'Missing masterId' }, 400);

    const metricsJson = metrics ? JSON.stringify(metrics) : null;
    const salesJson = sales ? JSON.stringify(sales) : null;
    const now = new Date().toISOString();

    await c.get('DB').prepare(
      `INSERT INTO fleet_nodes (id, name, location, status, last_seen, version, metrics_json, orders_json, created_at)
       VALUES (?, ?, 'Unknown', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         status = excluded.status,
         last_seen = excluded.last_seen,
         version = excluded.version,
         metrics_json = excluded.metrics_json,
         orders_json = excluded.orders_json`
    ).bind(
      masterId, name || 'Master Node', status || 'online', now, version || 'unknown', metricsJson, salesJson
    ).run();

    return c.json({ success: true, timestamp: now });
  } catch (error: any) {
    return c.json({ error: 'Heartbeat failed' }, 500);
  }
});

app.get('/cloud/fleet/status', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(`SELECT status FROM fleet_nodes`).all();
    const total = results.length;
    const online = results.filter(r => r.status === 'online').length;
    const offline = results.filter(r => r.status === 'offline' || r.status === 'disconnected').length;
    const warning = results.filter(r => r.status === 'warning' || r.status === 'degraded').length;
    
    return c.json({ total, online, offline, warning });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch status' }, 500);
  }
});

app.get('/cloud/fleet/stations', async (c) => {
  try {
    const { results } = await c.get('DB').prepare(`SELECT * FROM fleet_nodes ORDER BY last_seen DESC`).all();
    
    const stations = results.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      status: row.status,
      lastSeen: row.last_seen,
      version: row.version,
      metrics: row.metrics_json ? JSON.parse(row.metrics_json as string) : undefined,
      syncStatus: row.sync_status_json ? JSON.parse(row.sync_status_json as string) : undefined,
      orders: row.orders_json ? JSON.parse(row.orders_json as string) : undefined,
      photos: row.photos_json ? JSON.parse(row.photos_json as string) : undefined
    }));
    
    return c.json(stations);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch stations' }, 500);
  }
});

app.get('/cloud/fleet/stations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const row = await c.get('DB').prepare(`SELECT * FROM fleet_nodes WHERE id = ?`).bind(id).first();
    
    if (!row) return c.json({ error: 'Not found' }, 404);
    
    const station = {
      id: row.id,
      name: row.name,
      location: row.location,
      status: row.status,
      lastSeen: row.last_seen,
      version: row.version,
      metrics: row.metrics_json ? JSON.parse(row.metrics_json as string) : undefined,
      syncStatus: row.sync_status_json ? JSON.parse(row.sync_status_json as string) : undefined,
      orders: row.orders_json ? JSON.parse(row.orders_json as string) : undefined,
      photos: row.photos_json ? JSON.parse(row.photos_json as string) : undefined
    };
    return c.json(station);
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch station details' }, 500);
  }
});

app.post('/cloud/fleet/stations/:id/heartbeat', async (c) => {
  const id = c.req.param('id');
  return c.json({ success: true, message: `Ping requested for ${id}` });
});

app.post('/cloud/fleet/stations/:id/sync', async (c) => {
  const id = c.req.param('id');
  return c.json({ success: true, message: `Sync requested for ${id}` });
});

app.post('/cloud/fleet/sync-all', async (c) => {
  return c.json({ success: true, message: `Sync all requested` });
});

export default app;
