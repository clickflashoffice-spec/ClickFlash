import { parentPort } from 'worker_threads';
import Database from 'better-sqlite3';
import * as path from 'path';
import { logger } from '../utils/logger';

// If running as a standalone script or imported directly
const isWorker = !!parentPort;

const DB_PATH = path.join(process.cwd(), 'database', 'clickflash.db');

let db: Database.Database | null = null;
try {
  db = new Database(DB_PATH, { fileMustExist: true });
  logger.info('[SyncWorker] SQLite connected for Sync Worker.');
} catch (error) {
  logger.warn('[SyncWorker] Could not open SQLite database. Skipping.');
}

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

// Desk ID would typically come from an env var or settings table. We use a placeholder or fallback.
const DESK_ID = process.env.DESK_ID || 'DESK_MASTER_01';

async function checkInternetConnectivity(): Promise<boolean> {
  try {
    const res = await fetch('https://1.1.1.1', { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function runSyncCycle() {
  if (!db || isSyncing) return;
  isSyncing = true;

  const isOnline = await checkInternetConnectivity();
  if (!isOnline) {
    logger.debug('[SyncWorker] Offline. Skipping sync cycle.');
    isSyncing = false;
    scheduleNextSync();
    return;
  }

  logger.info('[SyncWorker] Starting Bi-directional Sync Cycle...');

  try {
    const cloudUrl = process.env.CLOUD_API_URL || 'http://localhost:8787';

    // ----------------------------------------------------
    // 1. UP-SYNC (Sessions, Transactions, Shifts)
    // ----------------------------------------------------
    
    // Grab un-synced sessions (assuming sync_status = 'PENDING' or similar)
    // We use a simplified try/catch because schemas might be missing
    let sessions: any[] = [];
    try {
        sessions = db.prepare(`SELECT * FROM kiosk_sessions WHERE synced_to_cloud = 0 LIMIT 100`).all();
    } catch(e) {
        // Table might not exist or field synced_to_cloud is missing
    }

    let transactions: any[] = [];
    try {
        transactions = db.prepare(`SELECT * FROM orders WHERE synced_to_cloud = 0 LIMIT 100`).all();
    } catch(e) {}

    // Prepare Up-Sync Payload
    const upSyncPayload = {
      deskId: DESK_ID,
      payloads: {
        sessions: sessions.map((s: any) => ({
            id: s.id,
            resortId: process.env.RESORT_ID || 'RESORT_01',
            status: s.status,
            createdAt: s.created_at
        })),
        transactions: transactions.map((t: any) => ({
            id: t.id,
            sessionId: t.sessionId,
            amount: t.total,
            status: t.status,
            createdAt: t.created_at
        })),
        shifts: [] // Implement shifts when table exists
      }
    };

    if (upSyncPayload.payloads.sessions.length > 0 || upSyncPayload.payloads.transactions.length > 0) {
        logger.info(`[SyncWorker] Up-Syncing ${sessions.length} sessions, ${transactions.length} transactions...`);
        const upRes = await fetch(`${cloudUrl}/api/sync/up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(upSyncPayload)
        });

        if (upRes.ok) {
            // Mark as synced
            if (sessions.length > 0) {
                const sIds = sessions.map(s => s.id);
                db.prepare(`UPDATE kiosk_sessions SET synced_to_cloud = 1 WHERE id IN (${sIds.map(()=>'?').join(',')})`).run(...sIds);
            }
            if (transactions.length > 0) {
                const tIds = transactions.map(t => t.id);
                db.prepare(`UPDATE orders SET synced_to_cloud = 1 WHERE id IN (${tIds.map(()=>'?').join(',')})`).run(...tIds);
            }
            logger.info('[SyncWorker] Up-Sync completed successfully.');
        } else {
            logger.error(`[SyncWorker] Up-Sync failed: ${upRes.statusText}`);
        }
    }

    // ----------------------------------------------------
    // 2. DOWN-SYNC (Bookings, Packs, Rosters)
    // ----------------------------------------------------
    logger.info('[SyncWorker] Running Down-Sync...');
    const downRes = await fetch(`${cloudUrl}/api/sync/down`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deskId: DESK_ID, lastSyncTimestamp: '1970-01-01T00:00:00Z' })
    });

    if (downRes.ok) {
        const data = await downRes.json();
        
        // Insert Down-Sync data into SQLite safely
        if (data.bookings && Array.isArray(data.bookings) && data.bookings.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO bookings (id, clientName, clientEmail, clientPhone, bookingDate, bookingTime, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                clientName=excluded.clientName, clientEmail=excluded.clientEmail, 
                clientPhone=excluded.clientPhone, bookingDate=excluded.bookingDate,
                bookingTime=excluded.bookingTime, status=excluded.status, updated_at=excluded.updated_at
            `);
            const runMany = db.transaction((bookings) => {
                for (const b of bookings) {
                    stmt.run(b.id, b.client_name, b.client_email, b.client_phone, b.booking_date, b.booking_time, b.status, b.created_at, b.updated_at);
                }
            });
            try { runMany(data.bookings); logger.info(`[SyncWorker] Synced ${data.bookings.length} bookings.`); } 
            catch(e: any) { logger.error(`[SyncWorker] Failed to insert bookings: ${e.message}`); }
        }

        if (data.packs && Array.isArray(data.packs) && data.packs.length > 0) {
            const stmt = db.prepare(`
                INSERT INTO packs (id, name, description, price, productsJSON, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET 
                name=excluded.name, description=excluded.description, price=excluded.price, 
                productsJSON=excluded.productsJSON, updated_at=excluded.updated_at
            `);
            const runMany = db.transaction((packs) => {
                for (const p of packs) {
                    stmt.run(p.id, p.name, p.description, p.price, p.products_json, p.created_at, p.updated_at);
                }
            });
            try { runMany(data.packs); logger.info(`[SyncWorker] Synced ${data.packs.length} packs.`); } 
            catch(e: any) { logger.error(`[SyncWorker] Failed to insert packs: ${e.message}`); }
        }
        
        // For rosters, you would implement similar logic.
        logger.info('[SyncWorker] Down-Sync completed successfully.');
    } else {
        logger.error(`[SyncWorker] Down-Sync failed: ${downRes.statusText}`);
    }

  } catch (err: any) {
    logger.error(`[SyncWorker] Sync cycle failed: ${err.message}`);
  } finally {
    isSyncing = false;
    scheduleNextSync();
  }
}

function scheduleNextSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(runSyncCycle, SYNC_INTERVAL);
}

export function startSyncWorker() {
  logger.info(`[SyncWorker] Starting CRON job with ${SYNC_INTERVAL/1000}s interval.`);
  runSyncCycle(); // initial run
}

if (isWorker && parentPort) {
  parentPort.on('message', async (job: any) => {
    if (job.type === 'sync-now') {
      await runSyncCycle();
    }
  });
  startSyncWorker();
}
