import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';
import { WorkerPool } from '../workers/workerPool';
import path from 'path';
import fs from 'fs';

export interface DbWriteQueueOptions {
  logger?: Logger;
  journalPath?: string;
  autoReplay?: boolean;
  flushInterval?: number;
}

export interface JournalEntry {
  entryId: string;
  table: string;
  id: string;
  data: Record<string, any>;
  priority: 'normal' | 'high';
  timestamp: number;
}

export class DbWriteQueue {
  private db: DatabaseManager;
  private logger?: Logger;
  private pool: WorkerPool;
  private journalPath: string;
  private inFlightCount: number = 0;
  private oldestWriteTime: number | null = null;
  private recoveryPromise: Promise<void> | null = null;

  constructor(db: DatabaseManager, options: DbWriteQueueOptions = {}) {
    this.db = db;
    this.logger = options.logger;
    
    this.journalPath = options.journalPath || path.resolve(process.cwd(), 'data/queue-journal.jsonl');
    try {
      const dir = path.dirname(this.journalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Ignore directory creation errors in mock environments
    }

    const workerScript = this.getWorkerPath();
    this.pool = new WorkerPool(workerScript, 1);

    if (options.autoReplay !== false) {
      this.recoveryPromise = this.recover();
    }
  }

  private getWorkerPath(): string {
    const devPath = path.resolve(__dirname, '../workers/dbWorker.ts');
    if (fs.existsSync(devPath)) return devPath;
    return path.resolve(process.cwd(), 'backend/workers/dbWorker.js');
  }

  public async recover(): Promise<void> {
    try {
      // 1. Recover from SQLite pending_writes table if present
      if (this.db && typeof (this.db as any).query === 'function') {
        try {
          const rows = (this.db as any).query(
            `SELECT id, table_name, record_id, payload_json, priority FROM pending_writes WHERE status = 'pending' ORDER BY created_at ASC`
          );
          if (Array.isArray(rows) && rows.length > 0) {
            this.logger?.info(`[DbWriteQueue] Recovering ${rows.length} pending writes from pending_writes table`);
            for (const row of rows) {
              try {
                const data = JSON.parse(row.payload_json);
                this.applyWriteDirectly(row.table_name, row.record_id, data);
                if (typeof (this.db as any).run === 'function') {
                  (this.db as any).run(`DELETE FROM pending_writes WHERE id = ?`, [row.id]);
                }
              } catch (err: any) {
                this.logger?.error(`[DbWriteQueue] Failed to recover row ${row.id}:`, { error: err.message });
              }
            }
          }
        } catch {
          // Table pending_writes may not exist
        }
      }

      // 2. Recover from append-only journal file if present
      if (fs.existsSync(this.journalPath)) {
        const content = fs.readFileSync(this.journalPath, 'utf8').trim();
        if (content.length > 0) {
          const lines = content.split('\n').filter(Boolean);
          this.logger?.info(`[DbWriteQueue] Recovering ${lines.length} writes from journal: ${this.journalPath}`);
          for (const line of lines) {
            try {
              const entry: JournalEntry = JSON.parse(line);
              this.applyWriteDirectly(entry.table, entry.id, entry.data);
            } catch (err: any) {
              this.logger?.error(`[DbWriteQueue] Corrupted journal line:`, { line, error: err.message });
            }
          }
          // Truncate journal after recovery
          fs.writeFileSync(this.journalPath, '', 'utf8');
        }
      }
    } catch (err: any) {
      this.logger?.error('[DbWriteQueue] Recovery failed:', { error: err.message });
    }
  }

  private applyWriteDirectly(table: string, id: string, data: Record<string, any>): void {
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    const columns = Object.keys(data);
    for (const col of columns) {
      if (!/^[a-zA-Z0-9_]+$/.test(col)) {
        throw new Error(`Invalid column name: ${col}`);
      }
    }
    const values = Object.values(data);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    if (this.db && typeof (this.db as any).run === 'function') {
      (this.db as any).run(sql, [...values, id]);
    } else if (this.db && typeof (this.db as any).getDb === 'function') {
      const raw = (this.db as any).getDb();
      if (raw && typeof raw.prepare === 'function') {
        raw.prepare(sql).run(...values, id);
      }
    }
  }

  async enqueue(table: string, id: string, data: Record<string, any>, priority: 'normal' | 'high' = 'normal'): Promise<void> {
    const now = Date.now();
    if (this.inFlightCount === 0) {
      this.oldestWriteTime = now;
    }
    this.inFlightCount++;

    const entryId = `${table}:${id}:${now}:${Math.random().toString(36).slice(2, 7)}`;
    const journalEntry: JournalEntry = { entryId, table, id, data, priority, timestamp: now };

    // Synchronous write-ahead log write before pool dispatch
    try {
      fs.appendFileSync(this.journalPath, JSON.stringify(journalEntry) + '\n', 'utf8');
    } catch (err: any) {
      this.logger?.warn('[DbWriteQueue] Journal append failed:', { error: err.message });
    }

    try {
      await this.pool.execute({ table, id, data, priority });
    } catch (err: any) {
      this.logger?.error('[DbWriteQueue] Worker execution failed', { error: err.message, table, id });
    } finally {
      this.inFlightCount = Math.max(0, this.inFlightCount - 1);
      if (this.inFlightCount === 0) {
        this.oldestWriteTime = null;
        // Truncate journal when queue drains
        try {
          if (fs.existsSync(this.journalPath)) {
            fs.writeFileSync(this.journalPath, '', 'utf8');
          }
        } catch {}
      }
    }
  }

  async flush(): Promise<void> {
    if (this.recoveryPromise) {
      await this.recoveryPromise;
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    await this.pool.shutdown();
  }

  getStats() {
    return {
      queueSize: this.inFlightCount,
      oldestWrite: this.oldestWriteTime,
      writeLatencyMs: this.oldestWriteTime ? Date.now() - this.oldestWriteTime : 0
    };
  }
}
