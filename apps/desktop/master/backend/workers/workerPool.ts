import { Worker } from 'worker_threads';
import os from 'os';
import { logger } from '../utils/logger';

export class WorkerPool {
  private workers: Worker[] = [];
  private nextWorkerIndex = 0;
  private taskCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private taskCounter = 0;

  constructor(workerScript: string, numWorkers: number = Math.max(1, os.cpus().length - 1)) {
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(workerScript);
      
      worker.on('message', (msg) => {
        const callback = this.taskCallbacks.get(msg.taskId);
        if (callback) {
          this.taskCallbacks.delete(msg.taskId);
          if (msg.success) {
            callback.resolve(msg.result);
          } else {
            callback.reject(new Error(msg.error));
          }
        }
      });
      
      worker.on('error', (err) => {
        logger.error(`[WorkerPool] Worker error: ${err.message}`);
      });
      
      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.warn(`[WorkerPool] Worker stopped with exit code ${code}`);
        }
      });

      this.workers.push(worker);
    }
    logger.info(`[WorkerPool] Initialized with ${numWorkers} workers.`);
  }

  execute(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.workers.length === 0) {
        return reject(new Error("No workers available in the pool"));
      }

      const taskId = `task_${this.taskCounter++}`;
      this.taskCallbacks.set(taskId, { resolve, reject });
      
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
      
      worker.postMessage({ ...task, taskId });
    });
  }

  shutdown(): Promise<void> {
    logger.info(`[WorkerPool] Shutting down ${this.workers.length} workers.`);
    const terminationPromises = this.workers.map(worker => worker.terminate());
    this.workers = [];
    return Promise.all(terminationPromises).then(() => {});
  }
}
