import * as SQLite from 'expo-sqlite';
import { logger } from '../src/utils/logger';

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

export interface LocalCheckin {
  id: string;
  gig_id: string;
  staff_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  type: 'check_in' | 'check_out';
  sync_status: 'pending' | 'synced';
}

export interface LocalPosTransaction {
  id: string;
  session_id: string;
  amount: number;
  currency: string;
  method: 'cash' | 'tap_to_pay' | 'room_charge';
  details: string; // JSON string of items or room info
  created_at: string;
  sync_status: 'pending' | 'synced';
}

export interface PendingApprovalItem {
  id: string;
  type: 'cash_payment' | 'photo_moderation';
  session_id: string;
  amount?: number;
  currency?: string;
  details: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Initialize the database tables.
 */
export function initDb() {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS local_scans (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        wristband_code TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        sync_route TEXT
      );

      CREATE TABLE IF NOT EXISTS local_checkins (
        id TEXT PRIMARY KEY,
        gig_id TEXT NOT NULL,
        staff_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL NOT NULL,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS local_pos_transactions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        method TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS pending_approvals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        session_id TEXT NOT NULL,
        amount REAL,
        currency TEXT,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'pending'
      );
    `);
    logger.info('Database schema initialized successfully (staff.db)');
  } catch (e) {
    logger.error('Failed to initialize staff.db schema:', { args: [e] });
  }
}

// ─── Scans ───────────────────────────────────────────────────────────────────

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

export function getPendingScans(): LocalScan[] {
  return db.getAllSync<LocalScan>(
    'SELECT * FROM local_scans WHERE sync_status = ?',
    'pending'
  );
}

export function markScanAsSynced(id: string, route: 'lan' | 'cloud') {
  db.runSync(
    'UPDATE local_scans SET sync_status = ?, sync_route = ? WHERE id = ?',
    'synced',
    route,
    id
  );
}

// ─── Check-ins ───────────────────────────────────────────────────────────────

export function insertCheckin(checkin: Omit<LocalCheckin, 'sync_status'>) {
  db.runSync(
    'INSERT INTO local_checkins (id, gig_id, staff_id, latitude, longitude, accuracy, timestamp, type, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    checkin.id,
    checkin.gig_id,
    checkin.staff_id,
    checkin.latitude,
    checkin.longitude,
    checkin.accuracy,
    checkin.timestamp,
    checkin.type,
    'pending'
  );
}

export function getPendingCheckins(): LocalCheckin[] {
  return db.getAllSync<LocalCheckin>(
    'SELECT * FROM local_checkins WHERE sync_status = ?',
    'pending'
  );
}

export function markCheckinAsSynced(id: string) {
  db.runSync('UPDATE local_checkins SET sync_status = ? WHERE id = ?', 'synced', id);
}

// ─── POS Transactions ────────────────────────────────────────────────────────

export function insertPosTransaction(tx: Omit<LocalPosTransaction, 'sync_status'>) {
  db.runSync(
    'INSERT INTO local_pos_transactions (id, session_id, amount, currency, method, details, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    tx.id,
    tx.session_id,
    tx.amount,
    tx.currency,
    tx.method,
    tx.details,
    tx.created_at,
    'pending'
  );
}

export function getPendingPosTransactions(): LocalPosTransaction[] {
  return db.getAllSync<LocalPosTransaction>(
    'SELECT * FROM local_pos_transactions WHERE sync_status = ?',
    'pending'
  );
}

export function markPosTransactionAsSynced(id: string) {
  db.runSync('UPDATE local_pos_transactions SET sync_status = ? WHERE id = ?', 'synced', id);
}

// ─── Pending Approvals (Cash & Moderation) ───────────────────────────────────

export function insertPendingApproval(item: Omit<PendingApprovalItem, 'status'>) {
  db.runSync(
    'INSERT OR REPLACE INTO pending_approvals (id, type, session_id, amount, currency, details, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    item.id,
    item.type,
    item.session_id,
    item.amount ?? null,
    item.currency ?? null,
    item.details,
    item.created_at,
    'pending'
  );
}

export function getPendingApprovals(): PendingApprovalItem[] {
  return db.getAllSync<PendingApprovalItem>(
    'SELECT * FROM pending_approvals WHERE status = ? ORDER BY created_at DESC',
    'pending'
  );
}

export function updateApprovalStatus(id: string, status: 'approved' | 'rejected') {
  db.runSync('UPDATE pending_approvals SET status = ? WHERE id = ?', status, id);
}

export function removeResolvedApprovals() {
  db.runSync('DELETE FROM pending_approvals WHERE status != ?', 'pending');
}
