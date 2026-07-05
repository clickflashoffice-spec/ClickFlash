// apps/master/backend/services/TelemetryService.ts
import { Logger } from "../utils/logger";

export interface TelemetryMetrics {
  "sync.queue_depth": number;
  "sync.dlq_count": number;
  "db.write_latency_ms": number;
  "backup.last_success_timestamp": number | null;
  sync: {
    queue_depth: number;
    dlq_count: number;
    [key: string]: any;
  };
  db: {
    write_latency_ms: number;
    queue_size: number;
    oldest_write: number | null;
    [key: string]: any;
  };
  backup: {
    last_success_timestamp: number | null;
    [key: string]: any;
  };
  timestamp: string;
}

export class TelemetryService {
  constructor(
    private readonly cloudSyncService: any,
    private readonly dbWriteQueue: any,
    private readonly backupService: any,
    private readonly logger?: Logger,
  ) {}

  public getTelemetry(): TelemetryMetrics {
    try {
      const syncStats = this.cloudSyncService?.getStats ? this.cloudSyncService.getStats() : {};
      const dbStats = this.dbWriteQueue?.getStats ? this.dbWriteQueue.getStats() : {};
      const backupStats = this.backupService?.getStats ? this.backupService.getStats() : {};

      const queueDepth = syncStats.metrics?.['sync.queue_depth'] ?? syncStats.queues?.operations ?? 0;
      const dlqCount = syncStats.metrics?.['sync.dlq_count'] ?? syncStats.queues?.dlq ?? 0;
      const writeLatencyMs = dbStats.writeLatencyMs ?? 0;
      const lastSuccessTimestamp = backupStats.lastSuccessTimestamp ?? null;

      return {
        "sync.queue_depth": queueDepth,
        "sync.dlq_count": dlqCount,
        "db.write_latency_ms": writeLatencyMs,
        "backup.last_success_timestamp": lastSuccessTimestamp,
        sync: {
          queue_depth: queueDepth,
          dlq_count: dlqCount,
          ...syncStats,
        },
        db: {
          write_latency_ms: writeLatencyMs,
          queue_size: dbStats.queueSize ?? 0,
          oldest_write: dbStats.oldestWrite ?? null,
          ...dbStats,
        },
        backup: {
          last_success_timestamp: lastSuccessTimestamp,
          ...backupStats,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      if (this.logger) {
        this.logger.error("[TelemetryService] Failed to gather telemetry", { error: err?.message });
      }
      return {
        "sync.queue_depth": 0,
        "sync.dlq_count": 0,
        "db.write_latency_ms": 0,
        "backup.last_success_timestamp": null,
        sync: { queue_depth: 0, dlq_count: 0 },
        db: { write_latency_ms: 0, queue_size: 0, oldest_write: null },
        backup: { last_success_timestamp: null },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
