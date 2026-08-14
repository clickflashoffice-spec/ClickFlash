// apps/master/backend/routes/system/telemetry.ts
import express, { Request, Response, Router } from "express";

export default function telemetryRoutes(context: any): Router {
  const router = express.Router();

  /**
   * @route GET /
   * @description Get aggregated system telemetry metrics
   */
  router.get("/", (_req: Request, res: Response) => {
    try {
      if (context?.telemetryService) {
        const telemetry = context.telemetryService.getTelemetry();
        res.json(telemetry);
      } else {
        // Fallback if telemetryService is not yet initialized
        const syncStats = context?.cloudSyncService?.getStats ? context.cloudSyncService.getStats() : {};
        const dbStats = context?.dbWriteQueue?.getStats ? context.dbWriteQueue.getStats() : {};
        const backupStats = context?.backupService?.getStats ? context.backupService.getStats() : {};

        const queueDepth = syncStats.metrics?.['sync.queue_depth'] ?? syncStats.queues?.operations ?? 0;
        const dlqCount = syncStats.metrics?.['sync.dlq_count'] ?? syncStats.queues?.dlq ?? 0;
        const writeLatencyMs = dbStats.writeLatencyMs ?? 0;
        const lastSuccessTimestamp = backupStats.lastSuccessTimestamp ?? null;

        res.json({
          "sync.queue_depth": queueDepth,
          "sync.dlq_count": dlqCount,
          "db.write_latency_ms": writeLatencyMs,
          "backup.last_success_timestamp": lastSuccessTimestamp,
          sync: { queue_depth: queueDepth, dlq_count: dlqCount, ...syncStats },
          db: { write_latency_ms: writeLatencyMs, queue_size: dbStats.queueSize ?? 0, oldest_write: dbStats.oldestWrite ?? null, ...dbStats },
          backup: { last_success_timestamp: lastSuccessTimestamp, ...backupStats },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      if (context?.logger) {
        context.logger.error("[TelemetryRoutes] Error retrieving telemetry", { error: err?.message });
      }
      res.status(500).json({
        status: "error",
        message: err?.message || "Failed to retrieve telemetry",
      });
    }
  });

  return router;
}
