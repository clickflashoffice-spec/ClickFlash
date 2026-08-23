import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';
import { WorkerPool } from '../workers/workerPool';
import path from 'path';
import fs from 'fs';

interface DbWriteQueueOptions {
  logger?: Logger;
}

export class DbWriteQueue {
  private db: DatabaseManager;
  private logger?: Logger;
  private pool: WorkerPool;

  constructor(db: DatabaseManager, options: DbWriteQueueOptions = {}) {
    this.db = db;
    this.logger = options.logger;
    
    const workerScript = this.getWorkerPath();
    this.pool = new WorkerPool(workerScript, 1);
  }

  private getWorkerPath(): string {
    const devPath = path.resolve(__dirname, '../workers/dbWorker.ts');
    if (fs.existsSync(devPath)) return devPath;
    return path.resolve(process.cwd(), 'backend/workers/dbWorker.js');
  }

  async enqueue(table: string, id: string, data: Record<string, any>, priority: 'normal' | 'high' = 'normal'): Promise<void> {
    try {
      await this.pool.execute({ table, id, data, priority });
    } catch (err: any) {
      this.logger?.error('[DbWriteQueue] Worker execution failed', { error: err.message, table, id });
    }
  }

  async flush(): Promise<void> {
    // No-op for compatibility
  }

  async shutdown(): Promise<void> {
    await this.pool.shutdown();
  }

  getStats() {
    return { queueSize: 0, oldestWrite: null, writeLatencyMs: 0 };
  }
}
