import { cors } from 'hono/cors';
import type { Bindings, AppEnv } from './types';
import { createMiddleware } from 'hono/factory';

export function getRegionalDB(env: Bindings, regionId?: string): D1Database {
  switch (regionId?.toUpperCase()) {
    case 'EU': return env.DB_EU;
    case 'AMER': return env.DB_AMER;
    case 'APAC': return env.DB_APAC;
    case 'MENA':
    default: return env.DB_MENA;
  }
}

export const corsMiddleware = cors({
  origin: [
    'https://gallery.clickflash.com',
    'https://admin.clickflash.com',
    'https://moneytrash.clickflash.com',
    'https://www.clickflash.com',
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000', 
    'http://localhost:8090'
  ],
  allowHeaders: [
    'Authorization',
    'Content-Type',
    'Stripe-Signature',
    'X-ClickFlash-Service-Key',
    'X-Region-ID'
  ]
});

export const regionRoutingMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const regionId = (c.req.header('X-Region-ID') || c.req.query('region_id') || 'MENA').toUpperCase();
  c.set('regionId', regionId);
  c.set('DB', getRegionalDB(c.env, regionId));
  await next();
});
