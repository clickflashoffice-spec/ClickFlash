import * as SQLite from 'expo-sqlite';
import { OfflineQueueItem, QueueItemType } from '../services/OfflineQueueService';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('clickflash.db');
    await initSchema(db);
  }
  return db;
}

export function getDatabaseSync(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('clickflash.db');
    initSchemaSync(db);
  }
  return db;
}

async function initSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      retryCount INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL
    );
  `);
}

function initSchemaSync(database: SQLite.SQLiteDatabase) {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      retryCount INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL
    );
  `);
}
