/**
 * Environment Configuration for Cloudflare Worker
 * 
 * SECURITY NOTE: JWT_SECRET must be set via environment variable in Cloudflare dashboard.
 * This file intentionally does not export JWT_SECRET - it's passed via the Env interface.
 * Never hardcode secrets here.
 */

// JWT_SECRET must be set as a Cloudflare Worker secret:
//   pnpm --dir workers/gallery-worker exec wrangler secret put JWT_SECRET --env=<environment>
// It is accessed via env.JWT_SECRET at runtime.
export const JWT_EXPIRY = '24h';

export const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5177',
    'http://localhost:5179',
    'http://localhost:8000',
    'https://gallery.clickflash.com',
    'https://clickflash.com'
];

export const SYNC_INTERVAL_MS = 300000;
export const REVENUE_RETENTION_DAYS = 30;

export const TABLE_MAP: Record<string, string> = {
    'users': 'users',
    'albums': 'albums',
    'photos': 'photos',
    'orders': 'orders',
    'products': 'products',
    'kiosks': 'kiosks',
    'settings': 'settings',
    'destinations': 'destinations',
    'session_types': 'session_types',
    'packs': 'packs',
    'bookings': 'bookings',
    'assets': 'archived_photos',
    'archived_photos': 'archived_photos'
};

export const JSON_COLUMNS: Record<string, string[]> = {
    users: ['workingHours'],
    albums: ['categories'],
    photos: ['manualEdits'],
    orders: ['items'],
    kiosks: ['settings'],
    settings: ['value'],
    destinations: ['featuresJSON'],
    packs: ['productsJSON'],
    archived_photos: ['metadata']
};
