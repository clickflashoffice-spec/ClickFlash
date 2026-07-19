import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { logger } from '../utils/logger';

export interface QueuedPhoto {
  id: string;
  localPath: string;
  size: number;
  eventName: string;
  accessCode: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retries: number;
  createdAt: number;
}

class LocalPhotoQueueService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly dbName = 'clickflash_ingestion.db';

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS photo_queue (
          id TEXT PRIMARY KEY,
          localPath TEXT NOT NULL,
          size INTEGER NOT NULL,
          eventName TEXT NOT NULL,
          accessCode TEXT NOT NULL,
          status TEXT NOT NULL,
          retries INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL
        );
      `);
      logger.info('LocalPhotoQueue initialized');
    } catch (err) {
      logger.error('Failed to initialize LocalPhotoQueue', err);
    }
  }

  async addPhoto(photo: Omit<QueuedPhoto, 'status' | 'retries' | 'createdAt'>): Promise<void> {
    if (!this.db) await this.init();
    
    const timestamp = Date.now();
    await this.db!.runAsync(
      'INSERT INTO photo_queue (id, localPath, size, eventName, accessCode, status, retries, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [photo.id, photo.localPath, photo.size, photo.eventName, photo.accessCode, 'pending', 0, timestamp]
    );
  }

  async getPendingPhotos(): Promise<QueuedPhoto[]> {
    if (!this.db) await this.init();
    const rows = await this.db!.getAllAsync<QueuedPhoto>(
      'SELECT * FROM photo_queue WHERE status = ? OR status = ? ORDER BY createdAt ASC',
      ['pending', 'failed']
    );
    return rows;
  }

  async updateStatus(id: string, status: QueuedPhoto['status']): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.runAsync('UPDATE photo_queue SET status = ? WHERE id = ?', [status, id]);
  }

  async incrementRetry(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.runAsync('UPDATE photo_queue SET retries = retries + 1, status = "failed" WHERE id = ?', [id]);
  }

  async removeCompletedPhotos(): Promise<void> {
    if (!this.db) await this.init();
    const completed = await this.db!.getAllAsync<QueuedPhoto>(
      'SELECT localPath FROM photo_queue WHERE status = ?',
      ['completed']
    );

    // Clean up local files to free up space
    for (const photo of completed) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(photo.localPath, { idempotent: true });
        }
      } catch (err) {
        logger.warn(`Failed to delete completed photo file: ${photo.localPath}`, err);
      }
    }

    await this.db!.runAsync('DELETE FROM photo_queue WHERE status = ?', ['completed']);
  }
}

export const LocalPhotoQueue = new LocalPhotoQueueService();
