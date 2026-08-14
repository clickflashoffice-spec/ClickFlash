import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.get('/', async (c) => {
  try {
    const db = c.get('DB');
    await db.prepare('SELECT 1').first();
    return c.json({ status: 'ok', db: 'connected' });
  } catch (error) {
    return c.json({ error: 'Service Unavailable' }, 503);
  }
});

export default app;
