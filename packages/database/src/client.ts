/**
 * client.ts — Drizzle ORM SQLite Client Factory
 *
 * Provides typed Drizzle instance wrappers around better-sqlite3
 * for both encrypted (SQLCipher) and standard SQLite databases.
 */
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3-multiple-ciphers';
import * as schema from './schema';

export type ClickFlashDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseOptions {
  path: string;
  encryptionKey?: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
}

/**
 * Creates and initializes a typed Drizzle ORM client with schema bindings.
 * Supports transparent SQLite encryption via better-sqlite3-multiple-ciphers.
 */
export function createDrizzleClient(options: DatabaseOptions): {
  db: ClickFlashDatabase;
  sqlite: Database.Database;
} {
  const sqlite = new Database(options.path, {
    readonly: options.readonly ?? false,
    fileMustExist: options.fileMustExist ?? false,
    verbose: options.verbose,
  });

  // Enable WAL mode for high concurrency
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  
  // Performance and concurrency optimizations
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('mmap_size = 268435456');

  // Apply encryption key if specified
  if (options.encryptionKey) {
    sqlite.pragma(`key = '${options.encryptionKey}'`);
  }

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

export * from './schema';
export { schema };
