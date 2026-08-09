import * as SQLite from 'expo-sqlite';
import { logger } from '../utils/logger';

const db = SQLite.openDatabaseSync('staff.db');

export interface QueueEvent {
  id: string;
  type: string;
  payload: string;
  timestamp: string;
  sync_status: 'pending' | 'synced';
}

class OfflineQueueImpl {
  constructor() {
    this.initDb();
  }

  private initDb() {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS offline_queue (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          sync_status TEXT DEFAULT 'pending'
        );
      `);
      logger.info('[OfflineQueue] Table initialized');
    } catch (e) {
      logger.error('[OfflineQueue] Init error', { args: [e] });
    }
  }

  async enqueue(type: string, payload: any): Promise<void> {
    const id = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const timestamp = new Date().toISOString();
    try {
      db.runSync(
        'INSERT INTO offline_queue (id, type, payload, timestamp, sync_status) VALUES (?, ?, ?, ?, ?)',
        id,
        type,
        JSON.stringify(payload),
        timestamp,
        'pending'
      );
      logger.info(`[OfflineQueue] Enqueued ${type} event`);
    } catch (e) {
      logger.error(`[OfflineQueue] Error enqueueing ${type}`, { args: [e] });
    }
  }

  getPendingEvents(): QueueEvent[] {
    try {
      return db.getAllSync<QueueEvent>(
        'SELECT * FROM offline_queue WHERE sync_status = ?',
        'pending'
      );
    } catch (e) {
      logger.error('[OfflineQueue] Error getting pending events', { args: [e] });
      return [];
    }
  }

  markAsSynced(id: string) {
    try {
      db.runSync('UPDATE offline_queue SET sync_status = ? WHERE id = ?', 'synced', id);
    } catch (e) {
      logger.error(`[OfflineQueue] Error marking ${id} as synced`, { args: [e] });
    }
  }
}

export const OfflineQueue = new OfflineQueueImpl();
