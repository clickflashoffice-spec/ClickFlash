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
  photoId?: string;
  [key: string]: any;
}

const MAX_QUEUE_DEPTH = 500;
const JOB_TIMEOUT_MS = 180_000; // 3 minutes timeout for a single job
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds heartbeat

export class WorkerPool {
  private queue: {
    job: WorkerJob;
    resolve: (res: any) => void;
    reject: (err: any) => void;
    priority: boolean;
    timestamp: number;
  }[] = [];
  private activeWorkers = new Map<
    number,
    { worker: Worker; jobId: string | null; lastHeartbeat: number; timeout?: NodeJS.Timeout }
  >();
  private idleWorkers: Worker[] = [];
  private maxWorkers: number;
  private workerScript: string;
  private logger: Logger;
  private shuttingDown = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(workerScript: string, logger: Logger, max?: number) {
    this.workerScript = workerScript;
    this.logger = logger;
    this.maxWorkers = max || Math.max(1, os.cpus().length - 2);
    this.logger.info(
      `[WorkerPool] Persistent pool initialized with max ${this.maxWorkers} workers for ${workerScript}`,
    );
    this.startHeartbeatMonitor();
  }

  private startHeartbeatMonitor() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, info] of this.activeWorkers.entries()) {
        if (info.jobId && now - info.lastHeartbeat > JOB_TIMEOUT_MS) {
          this.logger.error(`[WorkerPool] Worker ${id} hung on job ${info.jobId}. Terminating...`);
          this.terminateWorker(id);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private terminateWorker(id: number) {
    const info = this.activeWorkers.get(id);
    if (!info) return;

    if (info.timeout) clearTimeout(info.timeout);
    info.worker.terminate().catch((err) => 
      this.logger.error(`[WorkerPool] Failed to terminate worker ${id}: ${err.message}`)
    );
    this.activeWorkers.delete(id);
    this.idleWorkers = this.idleWorkers.filter((w) => (w as any).threadId !== id);
    this.processQueue();
  }

  private createWorker(): Worker {
    const isTypeScript = this.workerScript.endsWith(".ts");
    const workerOptions = isTypeScript
      ? { execArgv: ["--import", "tsx/esm"] }
      : {};
    const worker = new Worker(this.workerScript, workerOptions);
    const id = (worker as any).threadId;

    worker.on("message", (msg) => {
      if (msg === "pong" || msg?.type === "heartbeat") {
        const info = this.activeWorkers.get(id);
        if (info) info.lastHeartbeat = Date.now();
      }
    });

    worker.on("error", (err: Error) => {
      this.logger.error(`[WorkerPool] Worker ${id} Error: ${err.message}`);
      this.activeWorkers.delete(id);
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
      this.processQueue();
    });

    worker.on("exit", (code: number) => {
      if (code !== 0 && !this.shuttingDown) {
        this.logger.error(`[WorkerPool] Worker ${id} exited with code ${code}`);
      }
      this.activeWorkers.delete(id);
      this.idleWorkers = this.idleWorkers.filter((w) => w !== worker);
      this.processQueue();
    });

    return worker;
  }

  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    for (const item of this.queue) {
      item.reject(new Error("WorkerPool shutdown"));
    }
    this.queue = [];
    
    const allWorkers = Array.from(this.activeWorkers.values()).map((v) => v.worker);
    await Promise.allSettled(allWorkers.map((w) => w.terminate()));
    this.activeWorkers.clear();
    this.idleWorkers = [];
    this.logger.info("[WorkerPool] Shutdown complete.");
  }

  private handleWorkerReady(worker: Worker) {
    const id = (worker as any).threadId;
    this.activeWorkers.set(id, { worker, jobId: null, lastHeartbeat: Date.now() });
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

      // Fix: Corrected queue depth check (was using undefined this.MAX_QUEUE_DEPTH)
      if (this.queue.length >= MAX_QUEUE_DEPTH) {
        const err = new Error(`WorkerPool queue full (max ${MAX_QUEUE_DEPTH})`) as any;
        err.code = "WORKER_QUEUE_FULL";
        err.statusCode = 503;
        err.retryAfter = 5;
        return reject(err);
      }

      const jobWrapper = { job, resolve, reject, priority, timestamp: Date.now() };

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
    if (this.shuttingDown) return;

    while (this.queue.length > 0) {
      let worker = this.idleWorkers.shift();

      if (!worker && this.activeWorkers.size < this.maxWorkers) {
        worker = this.createWorker();
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

    const timeout = setTimeout(() => {
      this.logger.error(`[WorkerPool] Job ${jobId} timed out on worker ${id}`);
      this.terminateWorker(id);
      reject(new Error(`JOB_TIMEOUT: ${jobId}`));
    }, JOB_TIMEOUT_MS);

    this.activeWorkers.set(id, { worker, jobId, lastHeartbeat: Date.now(), timeout });

    const onMessage = (result: WorkerResult) => {
      if (result === "pong" || result?.type === "heartbeat") {
        const info = this.activeWorkers.get(id);
        if (info) info.lastHeartbeat = Date.now();
        return;
      }

      if (result.photoId === jobId || !result.photoId) {
        cleanup();
        clearTimeout(timeout);
        resolve(result);
        this.handleWorkerReady(worker);
      }
    };

    const onError = (err: Error) => {
      cleanup();
      clearTimeout(timeout);
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
