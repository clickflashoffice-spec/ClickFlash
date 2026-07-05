// backend/shared/ResourceMonitor.ts
import { Logger } from '../utils/logger';
import os from "os";

export class ResourceMonitor {
  private logger: Logger;
  private interval: NodeJS.Timeout | null = null;
  private readonly RSS_THRESHOLD = 1.8 * 1024 * 1024 * 1024; // 1.8GB
  private readonly HEAP_THRESHOLD = 1.5 * 1024 * 1024 * 1024; // 1.5GB

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public start(intervalMs: number = 30000): void {
    if (this.interval) return;

    this.logger.info(`[ResourceMonitor] Started (Interval: ${intervalMs}ms)`);
    this.interval = setInterval(() => this.check(), intervalMs);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private check(): void {
    const memory = process.memoryUsage();
    const cpuLoad = os.loadavg()[0]; // 1 min average

    if (
      memory.rss > this.RSS_THRESHOLD ||
      memory.heapUsed > this.HEAP_THRESHOLD
    ) {
      this.logger.warn(`[ResourceMonitor] High Memory Pressure Detected`, {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heap: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        cpu: cpuLoad.toFixed(2),
      });

      // Trigger Garbage Collection if exposed
      if (global.gc) {
        this.logger.info(
          `[ResourceMonitor] Triggering Manual Garbage Collection...`,
        );
        try {
          (global as any).gc();
          const postGc = process.memoryUsage();
          this.logger.info(`[ResourceMonitor] GC Complete`, {
            rssReduction: `${((memory.rss - postGc.rss) / 1024 / 1024).toFixed(2)} MB`,
          });
        } catch (e: any) {
          this.logger.error(`[ResourceMonitor] GC Failed`, {
            error: e.message,
          });
        }
      } else {
        this.logger.debug(
          `[ResourceMonitor] GC not exposed. Run Node with --expose-gc.`,
        );
      }
    }
  }

  public getStatus() {
    return {
      memory: process.memoryUsage(),
      cpu: os.loadavg(),
      uptime: process.uptime(),
    };
  }
}
