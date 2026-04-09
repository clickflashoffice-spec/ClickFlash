import { Worker } from "worker_threads";
import * as os from "os";
import { Logger } from "./logger";

export interface WorkerJob {
  type: string;
  [key: string]: any;
}

export interface WorkerResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

const MAX_QUEUE_DEPTH = 500;

export class WorkerPool {
  private queue: {
    job: WorkerJob;
    resolve: (res: any) => void;
    reject: (err: any) => void;
    priority: boolean;
  }[] = [];
  private activeWorkers = new Map<
    number,
    { worker: Worker; jobId: string | null }
  >();
  private idleWorkers: Worker[] = [];
  private maxWorkers: number;
  private workerScript: string;
  private logger: Logger;
  private shuttingDown = false;

  constructor(workerScript: string, logger: Logger, max?: number) {
    this.workerScript = workerScript;
    this.logger = logger;
    this.maxWorkers = max || Math.max(1, os.cpus().length - 2);
    this.logger.info(
      `[WorkerPool] Persistent pool initialized with max ${this.maxWorkers} workers for ${workerScript}`,
    );
  }

  private createWorker(): Worker {
    const worker = new Worker(this.workerScript);
    const id = (worker as any).threadId;

    // NOTE: No persistent "message" listener here — executeJob() registers
    // per-job one-shot handlers and calls handleWorkerReady() after cleanup.
    // Adding a persistent listener here caused the same worker to land in
    // idleWorkers twice (double-dispatch bug).

    worker.on("error", (err: Error) => {
      this.logger.error(`[WorkerPool] Worker ${id} Error: ${err.message}`);
      this.activeWorkers.delete(id);
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
      this.processQueue();
    });

    worker.on("exit", (code: number) => {
      if (code !== 0) {
        this.logger.error(`[WorkerPool] Worker ${id} exited with code ${code}`);
      }
      this.activeWorkers.delete(id);
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
      this.processQueue();
    });

    return worker;
  }

  /** Terminate all workers and drain the pending queue with cancellation errors. */
  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    // Reject all queued jobs
    for (const item of this.queue) {
      item.reject(new Error("WorkerPool shutdown"));
    }
    this.queue = [];
    // Terminate every worker
    const allWorkers = Array.from(this.activeWorkers.values()).map((v) => v.worker);
    await Promise.allSettled(allWorkers.map((w) => w.terminate()));
    this.activeWorkers.clear();
    this.idleWorkers = [];
    this.logger.info("[WorkerPool] Shutdown complete.");
  }

  private handleWorkerReady(worker: Worker) {
    const id = (worker as any).threadId;
    this.activeWorkers.set(id, { worker, jobId: null });
    this.idleWorkers.push(worker);
    this.processQueue();
  }

  public run(
    job: WorkerJob,
    signal?: AbortSignal,
    priority: boolean = false,
  ): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      if (this.shuttingDown) {
        return reject(new Error("WorkerPool shutdown"));
      }
      if (signal?.aborted) {
        return reject(new Error("JOB_CANCELLED"));
      }
      if (this.queue.length >= MAX_QUEUE_DEPTH) {
        return reject(new Error(`WorkerPool queue full (max ${MAX_QUEUE_DEPTH})`));
      }

      const jobWrapper = { job, resolve, reject, priority };

      if (signal) {
        signal.addEventListener("abort", () => {
          const idx = this.queue.indexOf(jobWrapper);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            reject(new Error("JOB_CANCELLED"));
          }
        });
      }

      this.queue.push(jobWrapper);
      if (priority) {
        this.queue.sort((a, b) =>
          a.priority === b.priority ? 0 : a.priority ? -1 : 1,
        );
      }
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.queue.length > 0) {
      let worker = this.idleWorkers.shift();

      if (!worker && this.activeWorkers.size < this.maxWorkers) {
        worker = this.createWorker();
        const id = (worker as any).threadId;
        this.activeWorkers.set(id, { worker, jobId: null });
      }

      if (!worker) break;

      const jobWrapper = this.queue.shift()!;
      this.executeJob(worker, jobWrapper);
    }
  }

  private executeJob(
    worker: Worker,
    wrapper: { job: WorkerJob; resolve: any; reject: any },
  ) {
    const id = (worker as any).threadId;
    const { job, resolve, reject } = wrapper;
    const jobId = job.photoId || Math.random().toString(36).substring(7);

    this.activeWorkers.set(id, { worker, jobId });

    // One-time listeners for this specific job
    const onMessage = (result: WorkerResult) => {
      if (result.photoId === jobId || !result.photoId) {
        cleanup();
        resolve(result);
        this.handleWorkerReady(worker);
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      worker.off("message", onMessage);
      worker.off("error", onError);
      worker.off("exit", onError);
    };

    worker.on("message", onMessage);
    worker.on("error", onError);
    worker.on("exit", onError);

    worker.postMessage(job);
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeWorkers.size - this.idleWorkers.length;
  }
}
