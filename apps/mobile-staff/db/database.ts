import * as SQLite from 'expo-sqlite';

// Open database synchronously
const db = SQLite.openDatabaseSync('staff.db');

export interface LocalScan {
  id: string;
  session_id: string;
  wristband_code: string;
  scanned_at: string;
  sync_status: 'pending' | 'synced';
  sync_route: 'lan' | 'cloud' | null;
}

/**
 * Initialize the database tables.
 */
export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS local_scans (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      wristband_code TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      sync_route TEXT
    );
  `);
}

/**
 * Insert a new barcode scan into the queue.
 */
export function insertScan(id: string, sessionId: string, wristbandCode: string) {
  const scannedAt = new Date().toISOString();
  db.runSync(
    'INSERT INTO local_scans (id, session_id, wristband_code, scanned_at) VALUES (?, ?, ?, ?)',
    id,
    sessionId,
    wristbandCode,
    scannedAt
  );
}

/**
 * Get all pending scans.
 */
export function getPendingScans(): LocalScan[] {
  return db.getAllSync<LocalScan>(
    'SELECT * FROM local_scans WHERE sync_status = ?',
    'pending'
  );
}

/**
 * Mark a scan as successfully synced.
 */
export function markAsSynced(id: string, route: 'lan' | 'cloud') {
  db.runSync(
    'UPDATE local_scans SET sync_status = ?, sync_route = ? WHERE id = ?',
    'synced',
    route,
    id
  );
}
