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
 *
 * Features:
 * -In-memory write queue with periodic flushing
 * - Automatic batching of related operations
 * - Priority queue for critical writes
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

  constructor(db: DatabaseManager, options: DbWriteQueueOptions = {}) {
    this.db = db;
    this.flushInterval = options.flushInterval || 2000; // 2s default
    this.maxQueueSize = options.maxQueueSize || 100;
    this.logger = options.logger;

    this.startFlushTimer();
  }

  /**
   * Enqueue a database write operation
   * @param table Table name
   * @param id Record ID
   * @param data Partial update data
   * @param priority Write priority (high = flush immediately)
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

    // High priority writes flush immediately
    if (priority === "high") {
      await this.flush();
      return;
    }

    // Force flush if queue is getting too large
    if (this.queue.size >= this.maxQueueSize) {
      this.logger?.warn(
        `DbWriteQueue size exceeded ${this.maxQueueSize}, forcing flush`,
      );
      await this.flush();
    }
  }

  /**
   * Flush all pending writes to database
   */
  async flush(): Promise<void> {
    if (this.queue.size === 0) return;

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

    // Execute batched writes per table inside a single transaction
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
            }
          }
        }
      });
      this.logger?.info("DbWriteQueue flush complete");
    } catch (error) {
      this.logger?.error("DbWriteQueue flush failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-enqueue failed writes (without awaiting to prevent recursion)
      for (const write of pendingWrites) {
        this.enqueue(write.table, write.id, write.data, "high").catch((err) => {
          this.logger?.error("Failed to re-enqueue write", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }
  }

  /**
   * Start periodic flush timer
   */
  private isFlushing = false;
  private startFlushTimer(): void {
    const drain = async () => {
      if (this.queue.size > 0 && !this.isFlushing) {
        this.isFlushing = true;
        try {
          await this.flush();
        } finally {
          this.isFlushing = false;
        }
      }
      // Yield to event loop and reschedule immediately if there's high volume
      // otherwise yield back to the system
      if (this.queue.size >= this.maxQueueSize) {
        setImmediate(drain);
      } else {
        this.flushTimer = setTimeout(drain, this.flushInterval);
      }
    };

    drain();
  }

  /**
   * Stop flush timer and flush remaining writes
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Get current queue statistics
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
