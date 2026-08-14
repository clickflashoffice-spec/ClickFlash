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

export class WorkerPool {
  private queue: {
    job: WorkerJob;
    resolve: (res: any) => void;
    reject: (err: any) => void;
  }[] = [];
  private activeCount = 0;
  private maxWorkers: number;
  private workerScript: string;
  private logger: Logger;

  constructor(workerScript: string, logger: Logger, max?: number) {
    this.workerScript = workerScript;
    this.logger = logger;
    // Default to N-2 cores to keep system responsive
    this.maxWorkers = max || Math.max(1, os.cpus().length - 2);
    this.logger.info(
      `[WorkerPool] Initialized with max ${this.maxWorkers} workers for ${workerScript}`,
    );
  }

  public run(job: WorkerJob): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      if (this.activeCount < this.maxWorkers) {
        this.execute(job, resolve, reject);
      } else {
        this.queue.push({ job, resolve, reject });
      }
    });
  }

  private execute(
    job: WorkerJob,
    resolve: (res: any) => void,
    reject: (err: any) => void,
  ) {
    this.activeCount++;

    const worker = new Worker(this.workerScript, {
      workerData: job,
    });

    // 30s Watchdog Timeout
    const timeout = setTimeout(() => {
      this.logger.error(
        `[WorkerPool] Job timed out after 30s in ${this.workerScript}`,
      );
      worker.terminate().catch(() => {});
      reject(new Error("JOB_TIMEOUT"));
    }, 30000);

    worker.on("message", (result: WorkerResult) => {
      clearTimeout(timeout);
      resolve(result);
      this.cleanup(worker);
    });

    worker.on("error", (err: Error) => {
      clearTimeout(timeout);
      this.logger.error(`[WorkerPool] Worker Error: ${err.message}`);
      reject(err);
      this.cleanup(worker);
    });

    worker.on("exit", (code: number) => {
      clearTimeout(timeout);
      if (code !== 0) {
        this.logger.error(`[WorkerPool] Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
      this.cleanup(worker);
    });
  }

  private cleanup(worker: Worker) {
    worker.terminate().catch(() => {});
    this.activeCount--;
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeCount < this.maxWorkers) {
      const next = this.queue.shift();
      if (next) {
        this.execute(next.job, next.resolve, next.reject);
      }
    }
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }
}
