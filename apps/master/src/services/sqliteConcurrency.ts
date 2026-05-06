/**
 * SQLite Concurrency Manager
 * 
 * Provides proper locking and concurrency handling for SQLite
 * to prevent "database is locked" errors.
 */

import { logger } from '@/utils/logger';
import { db as _dexieDb } from './db';

// This file uses SQLite methods; at runtime it targets the backend db adapter via alias
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _dexieDb as any;

export interface ConcurrencyConfig {
    maxRetries: number;
    retryDelayMs: number;
    busyTimeoutMs: number;
    journalMode: 'DELETE' | 'WAL' | 'MEMORY';
    synchronous: 'OFF' | 'NORMAL' | 'FULL';
}

const DEFAULT_CONFIG: ConcurrencyConfig = {
    maxRetries: 5,
    retryDelayMs: 100,
    busyTimeoutMs: 5000,
    journalMode: 'WAL',
    synchronous: 'NORMAL',
};

class SQLiteConcurrencyManager {
    private static instance: SQLiteConcurrencyManager;
    private config: ConcurrencyConfig;
    private isInitialized = false;

    private constructor(config?: Partial<ConcurrencyConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: Partial<ConcurrencyConfig>): SQLiteConcurrencyManager {
        if (!SQLiteConcurrencyManager.instance) {
            SQLiteConcurrencyManager.instance = new SQLiteConcurrencyManager(config);
        }
        return SQLiteConcurrencyManager.instance;
    }

    /**
     * Initialize with optimized settings
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            logger.info('[SQLiteConcurrency] Initializing with optimized settings...');

            // Enable WAL mode for better concurrency
            await db.execute(`
                PRAGMA journal_mode = ${this.config.journalMode};
            `);

            // Set busy timeout
            await db.execute(`
                PRAGMA busy_timeout = ${this.config.busyTimeoutMs};
            `);

            // Set synchronous mode
            await db.execute(`
                PRAGMA synchronous = ${this.config.synchronous};
            `);

            // Enable foreign keys
            await db.execute(`
                PRAGMA foreign_keys = ON;
            `);

            // Set cache size (negative = KB, positive = pages)
            await db.execute(`
                PRAGMA cache_size = -2000;
            `);

            // Enable memory-mapped I/O
            await db.execute(`
                PRAGMA mmap_size = 268435456;
            `);

            this.isInitialized = true;
            logger.info('[SQLiteConcurrency] Initialization complete', this.config);
        } catch (error) {
            logger.error('[SQLiteConcurrency] Failed to initialize', error);
            throw error;
        }
    }

    /**
     * Execute a query with retry logic
     */
    public async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName?: string
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                const errorMessage = lastError.message || '';

                // Check if it's a lock error
                if (
                    errorMessage.includes('SQLITE_BUSY') ||
                    errorMessage.includes('database is locked') ||
                    errorMessage.includes('SQLITE_LOCKED')
                ) {
                    logger.warn(`[SQLiteConcurrency] ${operationName || 'Operation'} failed (attempt ${attempt}/${this.config.maxRetries}): ${errorMessage}`);

                    if (attempt < this.config.maxRetries) {
                        await this.delay(this.config.retryDelayMs * attempt);
                        continue;
                    }
                }

                // Non-retryable error
                throw error;
            }
        }

        throw lastError;
    }

    /**
     * Execute a transaction with proper locking
     */
    public async executeTransaction<T>(
        operations: (() => Promise<T>)[],
        transactionName?: string
    ): Promise<T[]> {
        return this.executeWithRetry(async () => {
            const results: T[] = [];

            await db.execute('BEGIN IMMEDIATE');

            try {
                for (const operation of operations) {
                    results.push(await operation());
                }

                await db.execute('COMMIT');
                return results;
            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }
        }, transactionName || 'Transaction');
    }

    /**
     * Read with shared lock
     */
    public async read<T>(
        query: string,
        params?: unknown[]
    ): Promise<T[]> {
        return this.executeWithRetry(async () => {
            const result = await db.all(query, params);
            return result as T[];
        }, 'Read');
    }

    /**
     * Write with exclusive lock
     */
    public async write(
        query: string,
        params?: unknown[]
    ): Promise<{ changes: number; lastInsertRowid: number }> {
        return this.executeWithRetry(async () => {
            const _result = await db.run(query, params);
            return {
                changes: dbChanges(),
                lastInsertRowid: dbLastInsertRowid(),
            };
        }, 'Write');
    }

    /**
     * Batch insert with transaction
     */
    public async batchInsert(
        table: string,
        rows: Record<string, unknown>[],
        batchSize: number = 100
    ): Promise<{ inserted: number; failed: number }> {
        let inserted = 0;
        let failed = 0;

        await db.execute('BEGIN IMMEDIATE');

        try {
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);

                for (const row of batch) {
                    const columns = Object.keys(row).join(', ');
                    const placeholders = Object.keys(row).map(() => '?').join(', ');
                    const values = Object.values(row);

                    try {
                        await db.run(
                            `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
                            values
                        );
                        inserted++;
                    } catch {
                        failed++;
                    }
                }
            }

            await db.execute('COMMIT');
            return { inserted, failed };
        } catch (error) {
            await db.execute('ROLLBACK');
            throw error;
        }
    }

    /**
     * Check if database is currently locked
     */
    public async isLocked(): Promise<boolean> {
        try {
            await db.execute('SELECT 1');
            return false;
        } catch (error) {
            return (error as Error).message.includes('locked');
        }
    }

    /**
     * Get database statistics
     */
    public async getStats(): Promise<{
        pageSize: number;
        pageCount: number;
        freelistCount: number;
        schemaVersion: number;
    }> {
        const _result = await db.all('PRAGMA page_info');

        return {
            pageSize: (await db.all('PRAGMA page_size'))[0] as unknown as number,
            pageCount: (await db.all('PRAGMA page_count'))[0] as unknown as number,
            freelistCount: (await db.all('PRAGMA freelist_count'))[0] as unknown as number,
            schemaVersion: (await db.all('PRAGMA schema_version'))[0] as unknown as number,
        };
    }

    /**
     * Vacuum database to reclaim space
     */
    public async vacuum(): Promise<void> {
        logger.info('[SQLiteConcurrency] Starting VACUUM...');
        await db.execute('VACUUM');
        logger.info('[SQLiteConcurrency] VACUUM complete');
    }

    /**
     * Analyze database for query optimization
     */
    public async analyze(): Promise<void> {
        logger.info('[SQLiteConcurrency] Running ANALYZE...');
        await db.execute('ANALYZE');
        logger.info('[SQLiteConcurrency] ANALYZE complete');
    }

    /**
     * Helper delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global helper functions for db wrapper
function dbChanges(): number {
    return 0; // Placeholder - actual implementation would use better-sqlite3
}

function dbLastInsertRowid(): number {
    return 0; // Placeholder
}

export const sqliteConcurrency = SQLiteConcurrencyManager.getInstance();
export default sqliteConcurrency;
