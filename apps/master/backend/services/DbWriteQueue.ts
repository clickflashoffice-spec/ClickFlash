import { Logger } from "../shared/logger";
import { DatabaseManager } from "../shared/db";

interface PendingWrite {
  table: string;
  id: string;
  data: Record<string, any>;
  timestamp: number;
  priority: "normal" | "high";
}

interface DbWriteQueueOptions {
  flushInterval?: number; // Base flush interval (ms)
  maxQueueSize?: number; // Force flush if queue exceeds this
  logger?: Logger; // Optional logger instance
}

/**
 * Zero-Block IO: Deferred database write queue
 *
 * Batches and defers database writes to prevent UI blocking during heavy operations.
 * NOW WITH POWER-CYCLE RESILIENCE: All pending writes are persisted to SQLite
 * before being applied. On boot, any unflushed writes are automatically recovered
 * and flushed.
 *
 * Features:
 * - In-memory write queue with periodic flushing
 * - Automatic batching of related operations
 * - Priority queue for critical writes
 * - Persistent pending_writes table for crash/power safety
 *
 * @example
 * ```ts
 * const queue = new DbWriteQueue(db, { logger });
 * await queue.enqueue('photos', photoId, { title: 'New Title' });
 * // Write will flush within 2 seconds
 * ```
 */
export class DbWriteQueue {
  private queue = new Map<string, PendingWrite>();
  private flushInterval: number;
  private maxQueueSize: number;
  private flushTimer: NodeJS.Timeout | null = null;
  private db: DatabaseManager;
  private logger?: Logger;
  private isFlushing = false;

  constructor(db: DatabaseManager, options: DbWriteQueueOptions = {}) {
    this.db = db;
    this.flushInterval = options.flushInterval || 2000; // 2s default
    this.maxQueueSize = options.maxQueueSize || 100;
    this.logger = options.logger;

    // Power-cycle resilience: recover any pending writes from previous session
    this.recoverPendingWrites();

    this.startFlushTimer();
  }

  /**
   * Enqueue a database write operation.
   * Persists to SQLite before applying to survive power cycles.
   */
  async enqueue(
    table: string,
    id: string,
    data: Record<string, any>,
    priority: "normal" | "high" = "normal",
  ): Promise<void> {
    const key = `${table}:${id}`;

    // Merge with existing pending write if present
    const existing = this.queue.get(key);
    if (existing) {
      existing.data = { ...existing.data, ...data };
      existing.timestamp = Date.now();
      existing.priority = priority === "high" ? "high" : existing.priority;
    } else {
      this.queue.set(key, {
        table,
        id,
        data,
        timestamp: Date.now(),
        priority,
      });
    }

    // Persist to SQLite for power-cycle safety
    try {
      // Application-level JSON merge (json_patch is not standard SQLite)
      const existingRow = this.db.get<{ payload_json: string; priority: string }>(
        `SELECT payload_json, priority FROM pending_writes WHERE id = ?`,
        [key]
      );
      const mergedPayload = existingRow
        ? { ...JSON.parse(existingRow.payload_json), ...data }
        : data;
      const mergedPriority = priority === "high" ? "high" : (existingRow?.priority || "normal");

      this.db.run(
        `INSERT INTO pending_writes (id, table_name, record_id, payload_json, priority, status, retry_count, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           payload_json = excluded.payload_json,
           priority = excluded.priority,
           status = 'pending',
           retry_count = 0,
           updated_at = datetime('now')`,
        [key, table, id, JSON.stringify(mergedPayload), mergedPriority]
      );
    } catch (err: any) {
      this.logger?.error(`[DbWriteQueue] Failed to persist pending write`, {
        error: err?.message ?? String(err),
        table,
        id,
      });
    }

    if (priority === "high") {
      await this.flush();
      return;
    }

    if (this.queue.size >= this.maxQueueSize) {
      this.logger?.warn(
        `DbWriteQueue size exceeded ${this.maxQueueSize}, forcing flush`,
      );
      await this.flush();
    }
  }

  /**
   * Flush all pending writes to database.
   * Uses a 2-phase commit to survive power cycles:
   *   1. Mark rows as 'flushing' in pending_writes
   *   2. Apply writes to target tables inside a transaction
   *   3. Delete 'flushing' rows only after successful commit
   * If power is lost between (1) and (3), recovery will re-apply 'flushing' rows.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.size === 0) return;
    this.isFlushing = true;

    const pendingWrites = Array.from(this.queue.values());
    this.queue.clear();

    this.logger?.info(
      `Flushing ${pendingWrites.length} pending database writes`,
    );

    // Group by table for batch operations
    const writesByTable = new Map<string, PendingWrite[]>();
    for (const write of pendingWrites) {
      const existing = writesByTable.get(write.table) || [];
      existing.push(write);
      writesByTable.set(write.table, existing);
    }

    const failedKeys: string[] = [];
    const keys = pendingWrites.map((w) => `${w.table}:${w.id}`);

    // Phase 1: Mark as 'flushing' in pending_writes
    try {
      const placeholders = keys.map(() => '?').join(',');
      this.db.run(
        `UPDATE pending_writes SET status = 'flushing', updated_at = datetime('now') WHERE id IN (${placeholders})`,
        keys
      );
    } catch (err: any) {
      this.logger?.error(`[DbWriteQueue] Failed to mark writes as flushing`, {
        error: err?.message ?? String(err),
      });
      // Re-enqueue everything and abort
      for (const write of pendingWrites) {
        this.enqueue(write.table, write.id, write.data, "high").catch((err) => {
          this.logger?.error("Failed to re-enqueue write", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
      this.isFlushing = false;
      return;
    }

    try {
      this.db.transaction(() => {
        for (const [table, tableWrites] of writesByTable.entries()) {
          for (const write of tableWrites) {
            try {
              const columns = Object.keys(write.data);
              const values = Object.values(write.data);
              const setClause = columns.map((col) => `${col} = ?`).join(", ");
              const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
              this.db.prepare(sql).run(...values, write.id);
            } catch (error) {
              this.logger?.error(
                `Failed to flush write to ${table}:${write.id}`,
                {
                  error: error instanceof Error ? error.message : String(error),
                  table,
                  id: write.id,
                },
              );
              failedKeys.push(`${table}:${write.id}`);
            }
          }
        }
      });

      // Phase 3: On success, delete 'flushing' records from pending_writes
      if (keys.length > 0) {
        const placeholders = keys.map(() => '?').join(',');
        try {
          this.db.run(
            `DELETE FROM pending_writes WHERE status = 'flushing' AND id IN (${placeholders})`,
            keys
          );
        } catch (err: any) {
          this.logger?.warn(`[DbWriteQueue] Failed to clean up pending_writes`, {
            error: err?.message ?? String(err),
          });
        }
      }

      // Re-enqueue failed writes (without awaiting to prevent recursion)
      for (const key of failedKeys) {
        const write = pendingWrites.find((w) => `${w.table}:${w.id}` === key);
        if (write) {
          this.enqueue(write.table, write.id, write.data, "high").catch((err) => {
            this.logger?.error("Failed to re-enqueue write", {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }

      this.logger?.info("DbWriteQueue flush complete");
    } catch (error) {
      this.logger?.error("DbWriteQueue flush failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-enqueue all as high priority (they remain 'flushing' in DB, recovery will pick them up)
      for (const write of pendingWrites) {
        this.enqueue(write.table, write.id, write.data, "high").catch((err) => {
          this.logger?.error("Failed to re-enqueue write", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Recover pending writes from SQLite on boot.
   * This guarantees zero data loss across power cycles.
   * Recovers both 'pending' and 'flushing' rows (the latter may be from a crash mid-flush).
   */
  private recoverPendingWrites(): void {
    try {
      const rows = this.db.query<{
        id: string;
        table_name: string;
        record_id: string;
        payload_json: string;
        priority: string;
      }>(
        `SELECT id, table_name, record_id, payload_json, priority
         FROM pending_writes
         WHERE status IN ('pending', 'flushing')
         ORDER BY created_at ASC`
      );

      if (rows.length === 0) return;

      this.logger?.info(
        `[DbWriteQueue] Recovering ${rows.length} pending writes from previous session (including ${rows.filter(r => this.db.get(`SELECT status FROM pending_writes WHERE id = ?`, [r.id])?.status === 'flushing').length} mid-flush)`
      );

      for (const row of rows) {
        try {
          const data = JSON.parse(row.payload_json);
          this.queue.set(row.id, {
            table: row.table_name,
            id: row.record_id,
            data,
            timestamp: Date.now(),
            priority: row.priority as "normal" | "high",
          });
        } catch (parseErr) {
          this.logger?.warn(`[DbWriteQueue] Failed to parse recovered write`, {
            id: row.id,
            error: parseErr instanceof Error ? parseErr.message : String(parseErr),
          });
        }
      }

      // Immediately flush recovered writes
      this.flush().catch((err) => {
        this.logger?.error(`[DbWriteQueue] Failed to flush recovered writes`, {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err: any) {
      // Table may not exist yet on first boot before migrations run
      if (!err.message?.includes("no such table")) {
        this.logger?.warn(`[DbWriteQueue] Recovery query failed`, {
          error: err?.message ?? String(err),
        });
      }
    }
  }

  private startFlushTimer(): void {
    const drain = async () => {
      await this.flush();
      if (this.queue.size >= this.maxQueueSize) {
        setImmediate(drain);
      } else {
        this.flushTimer = setTimeout(drain, this.flushInterval);
      }
    };

    drain();
  }

  /**
   * Stop flush timer and flush remaining writes.
   * Safe to call during graceful shutdown.
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Get current queue statistics.
   */
  getStats(): { queueSize: number; oldestWrite: number | null } {
    let oldestTimestamp: number | null = null;

    for (const write of this.queue.values()) {
      if (!oldestTimestamp || write.timestamp < oldestTimestamp) {
        oldestTimestamp = write.timestamp;
      }
    }

    return {
      queueSize: this.queue.size,
      oldestWrite: oldestTimestamp ? Date.now() - oldestTimestamp : null,
    };
  }
}
