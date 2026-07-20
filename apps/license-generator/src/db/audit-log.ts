import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import { app } from 'electron';
import os from 'os';
import crypto from 'crypto';

let db: Database.Database | null = null;

export interface AuditLogEntry {
  id: string;
  issuedAt: string;
  operatorUser: string;
  plan: string;
  maxMasters: number;
  expiresDays: number;
  count: number;
  machineId: string;
  licenseKey: string;
}

export interface RevocationEntry {
  licenseKey: string;
  revokedAt: string;
  reason: string;
}

export function initAuditDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'audit.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS license_log (
      id TEXT PRIMARY KEY,
      issuedAt TEXT NOT NULL,
      operatorUser TEXT NOT NULL,
      plan TEXT NOT NULL,
      maxMasters INTEGER NOT NULL,
      expiresDays INTEGER NOT NULL,
      count INTEGER NOT NULL,
      machineId TEXT NOT NULL,
      licenseKey TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS revocations (
      licenseKey TEXT PRIMARY KEY,
      revokedAt TEXT NOT NULL,
      reason TEXT NOT NULL
    );
  `);
}

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'audit.db');
}

export function logIssuance(entry: Omit<AuditLogEntry, 'id' | 'issuedAt' | 'operatorUser'>): void {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    INSERT INTO license_log (id, issuedAt, operatorUser, plan, maxMasters, expiresDays, count, machineId, licenseKey)
    VALUES (@id, @issuedAt, @operatorUser, @plan, @maxMasters, @expiresDays, @count, @machineId, @licenseKey)
  `);

  stmt.run({
    id: crypto.randomUUID(),
    issuedAt: new Date().toISOString(),
    operatorUser: os.userInfo().username,
    ...entry,
  });
}

export function getAuditLogs(): AuditLogEntry[] {
  if (!db) throw new Error('Database not initialized');
  return db.prepare('SELECT * FROM license_log ORDER BY issuedAt DESC').all() as AuditLogEntry[];
}

export function revokeLicense(licenseKey: string, reason: string): void {
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO revocations (licenseKey, revokedAt, reason)
    VALUES (@licenseKey, @revokedAt, @reason)
  `);

  stmt.run({
    licenseKey,
    revokedAt: new Date().toISOString(),
    reason,
  });
}

export function getRevocations(): RevocationEntry[] {
  if (!db) throw new Error('Database not initialized');
  return db.prepare('SELECT * FROM revocations ORDER BY revokedAt DESC').all() as RevocationEntry[];
}

export function isRevoked(licenseKey: string): boolean {
  if (!db) throw new Error('Database not initialized');
  const result = db.prepare('SELECT 1 FROM revocations WHERE licenseKey = ?').get(licenseKey);
  return !!result;
}
