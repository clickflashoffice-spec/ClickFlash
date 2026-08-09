import { parentPort } from 'worker_threads';
import Database from 'better-sqlite3-multiple-ciphers';
import * as path from 'path';
import { logger } from '../utils/logger';

if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

const DB_PATH = path.join(process.cwd(), 'database', 'clickflash.db');

interface SyncJob {
  type?: 'sync-now';
}

// Ensure the db exists
let db: Database.Database | null = null;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
} catch (error) {
  logger.warn('[CloudSyncWorker] Could not open SQLite database. Skipping.');
}

// Backoff Configuration
const MIN_INTERVAL = 60 * 1000; // 1 minute
const MAX_INTERVAL = 30 * 60 * 1000; // 30 minutes
let currentInterval = MIN_INTERVAL;
let consecutiveFailures = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

async function checkInternetConnectivity(): Promise<boolean> {
  try {
    const res = await fetch('https://1.1.1.1', { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function pushToCloudflare(endpoint: string, payload: any): Promise<boolean> {
  const cloudUrl = process.env.CLOUD_API_URL || 'https://api.clickflash.com';
  const token = process.env.CLOUD_API_TOKEN || 'ENV_TOKEN';
  
  try {
    const res = await fetch(`${cloudUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

function getAnalyticsForDate(dateStr: string) {
  if (!db) return [];
  try {
    // Calculate analytics for the given date
    const stats = db.prepare(`
      SELECT
          u.id AS photographer_id,
          u.name AS photographer_name,
          COUNT(DISTINCT p.id) AS imported_photos,
          COUNT(DISTINCT o.id) AS total_customers,
          COALESCE(SUM(CASE WHEN o.status = 'Completed' THEN o.total ELSE 0 END), 0) AS sales_revenue
      FROM users u
      LEFT JOIN photos p ON p.photographerId = u.id AND date(p.created_at) = ?
      LEFT JOIN orders o ON o.photographerId = u.id AND date(o.created_at) = ?
      WHERE u.role = 'photographer'
      GROUP BY u.id
      HAVING imported_photos > 0 OR total_customers > 0
    `).all(dateStr, dateStr);
    return stats;
  } catch (e) {
    logger.error(`[CloudSyncWorker] Failed to query analytics: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

async function runSyncCycle() {
  if (!db || isSyncing) return;
  isSyncing = true;

  const isOnline = await checkInternetConnectivity();
  if (!isOnline) {
    logger.debug('[CloudSyncWorker] Offline. Queueing for later.');
    handleFailure();
    isSyncing = false;
    return;
  }

  let successAll = true;

  try {
    // 1. Sync Orders
    try {
      const pendingOrders = db.prepare(`SELECT * FROM orders WHERE synced_to_cloud = 0 LIMIT 50`).all();
      if (pendingOrders.length > 0) {
        logger.info(`[CloudSyncWorker] Found ${pendingOrders.length} pending orders to sync.`);
        const success = await pushToCloudflare('/v1/sync/orders', { orders: pendingOrders });
        if (success) {
          const orderIds = pendingOrders.map((o: any) => o.id);
          db.prepare(`UPDATE orders SET synced_to_cloud = 1 WHERE id IN (${orderIds.map(() => '?').join(',')})`).run(...orderIds);
          logger.info(`[CloudSyncWorker] Synced ${pendingOrders.length} orders successfully.`);
        } else {
          successAll = false;
        }
      }
    } catch (e: any) {
      if (!e.message.includes('no such column')) {
        logger.debug(`[CloudSyncWorker] Orders sync error: ${e.message}`);
      }
      successAll = false;
    }

    // 2. Sync Photos (Metadata)
    try {
      const pendingPhotos = db.prepare(`SELECT * FROM photos WHERE synced_to_cloud = 0 LIMIT 100`).all();
      if (pendingPhotos.length > 0) {
        logger.info(`[CloudSyncWorker] Found ${pendingPhotos.length} pending photos to sync.`);
        const success = await pushToCloudflare('/v1/sync/photos', { photos: pendingPhotos });
        if (success) {
          const photoIds = pendingPhotos.map((p: any) => p.id);
          db.prepare(`UPDATE photos SET synced_to_cloud = 1 WHERE id IN (${photoIds.map(() => '?').join(',')})`).run(...photoIds);
          logger.info(`[CloudSyncWorker] Synced ${pendingPhotos.length} photos successfully.`);
        } else {
          successAll = false;
        }
      }
    } catch (e: any) {
      if (!e.message.includes('no such column')) {
        logger.debug(`[CloudSyncWorker] Photos sync error: ${e.message}`);
      }
      successAll = false;
    }

    // 3. Sync Analytics
    try {
      const today = new Date().toISOString().split("T")[0];
      const analyticsData = getAnalyticsForDate(today);
      if (analyticsData.length > 0) {
        const success = await pushToCloudflare('/v1/sync/analytics', { date: today, analytics: analyticsData });
        if (success) {
          logger.info(`[CloudSyncWorker] Synced analytics for ${today} successfully.`);
        } else {
          successAll = false;
        }
      }
    } catch (e: any) {
      logger.debug(`[CloudSyncWorker] Analytics sync error: ${e.message}`);
      successAll = false;
    }

    if (successAll) {
      handleSuccess();
    } else {
      handleFailure();
    }

  } catch (err: any) {
    logger.error(`[CloudSyncWorker] Sync cycle failed: ${err.message}`);
    handleFailure();
  } finally {
    isSyncing = false;
  }
}

function handleSuccess() {
  if (consecutiveFailures > 0) {
    logger.info('[CloudSyncWorker] Sync recovered successfully.');
  }
  consecutiveFailures = 0;
  currentInterval = MIN_INTERVAL;
  scheduleNextSync();
}

function handleFailure() {
  consecutiveFailures++;
  // Exponential backoff
  currentInterval = Math.min(MAX_INTERVAL, currentInterval * 1.5);
  logger.warn(`[CloudSyncWorker] Sync failed or partial. Backing off to ${Math.round(currentInterval / 1000)}s`);
  scheduleNextSync();
}

function scheduleNextSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(runSyncCycle, currentInterval);
}

parentPort.on('message', async (job: SyncJob) => {
  if (job.type === 'sync-now') {
    await runSyncCycle();
  }
});

// Run an initial cycle after 5s
syncTimer = setTimeout(runSyncCycle, 5000);
