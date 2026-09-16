import { getDatabase } from '../backend/database';
import { logger } from "@/utils/logger";
import { appState } from '../store';
import { RustCore } from '../../modules/clickflash-rust-core';
import * as FileSystem from 'expo-file-system/legacy';

export function getRustDbPath(): string {
  let dbPath = 'clickflash.db';
  if (FileSystem.documentDirectory) {
    dbPath = FileSystem.documentDirectory.replace(/^file:\/\//, '') + 'SQLite/clickflash.db';
  }
  return dbPath;
}

export type QueueItemType = 'SHIFT_EVENT' | 'PHOTO_SYNC' | 'FACE_ENROLL' | 'GENERIC_API';

export interface OfflineQueueItem {
  id: string;
  type: QueueItemType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload: Record<string, unknown> | unknown;
  timestamp: number;
  retryCount: number;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
}

export class OfflineQueueService {
  private static instance: OfflineQueueService;

  private constructor() {}

  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Load offline items from SQLite database.
   */
  public async initialize(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payload TEXT,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER NOT NULL,
        priority TEXT NOT NULL
      )
    `);
    appState.network.offlineQueueSize = await this.getQueueSize();
  }

  /**
   * Add a request or event to the durable offline queue.
   */
  public async enqueue(
    type: QueueItemType,
    endpoint: string,
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    payload: unknown,
    priority: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'
  ): Promise<OfflineQueueItem> {
    const payloadStr = JSON.stringify(payload);
    const dbPath = getRustDbPath();

    // Delegate strictly to Rust Core
    const result = RustCore.enqueueSyncEvent({
      dbPath,
      eventType: type,
      endpoint,
      method,
      payload: payloadStr,
      priority
    });
    
    logger.info(`[OfflineQueueService] Enqueued ${type} (${endpoint}) via Rust Core: ${result}`);
    appState.network.offlineQueueSize = await this.getQueueSize();
    
    return {
      id: "rust-managed",
      type,
      endpoint,
      method,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      priority
    };
  }

  /**
   * Get all currently queued items.
   */
  public async getQueue(): Promise<OfflineQueueItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      endpoint: string;
      method: string;
      payload: string;
      timestamp: number;
      retryCount: number;
      priority: string;
    }>(`
      SELECT * FROM offline_queue
      ORDER BY 
        CASE priority 
          WHEN 'HIGH' THEN 1 
          WHEN 'NORMAL' THEN 2 
          WHEN 'LOW' THEN 3 
          ELSE 4 
        END ASC,
        timestamp ASC
    `);

    return rows.map(row => ({
      id: row.id,
      type: row.type as QueueItemType,
      endpoint: row.endpoint,
      method: row.method as 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
      retryCount: row.retryCount,
      priority: row.priority as 'HIGH' | 'NORMAL' | 'LOW'
    }));
  }

  /**
   * Remove an item from the queue by ID after successful sync or processing.
   */
  public async dequeue(itemId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM offline_queue WHERE id = ?`, [itemId]);
    appState.network.offlineQueueSize = await this.getQueueSize();
  }

  /**
   * Increment retry counter on failed sync attempt.
   */
  public async incrementRetry(itemId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE offline_queue SET retryCount = retryCount + 1 WHERE id = ?`, [itemId]);
  }

  /**
   * Clear all items in the queue.
   */
  public async clearQueue(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM offline_queue`);
    appState.network.offlineQueueSize = 0;
  }

  public async getQueueSize(): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{count: number}>(`SELECT COUNT(*) as count FROM offline_queue`);
    return result?.count || 0;
  }
}

export const offlineQueueService = OfflineQueueService.getInstance();
