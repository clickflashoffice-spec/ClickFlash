import { Router, Request, Response } from "express";
import { CloudSyncService } from "../services/cloudSyncService";

export default (context: any) => {
  const router = Router();
  const { logger, cloudSyncService } = context;

  // GET /api/cloud/status
  router.get("/status", (req: Request, res: Response) => {
    if (!cloudSyncService) {
      return res
        .status(503)
        .json({ success: false, msg: "Cloud Service not initialized" });
    }
    // Expose internal state (enabled, isSyncing) via public getters we need to add to Service
    // For now, assuming we add getters or make them public-ish
    res.json({
      success: true,
      status: "online", // Stub
      // We should probably redirect to getStats which now returns status
      // But for now, keep as is
    });
  });

  // POST /api/cloud/queue/pause
  router.post("/queue/pause", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    cloudSyncService.pause();
    res.json({ success: true, message: "Sync Paused" });
  });

  // POST /api/cloud/queue/resume
  router.post("/queue/resume", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    cloudSyncService.resume();
    res.json({ success: true, message: "Sync Resumed" });
  });

  // POST /api/cloud/queue/purge
  router.post("/queue/purge", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    cloudSyncService.purgeQueue();
    res.json({ success: true, message: "Queue Purged" });
  });

  router.get("/stats", (req: Request, res: Response) => {
    if (!cloudSyncService) {
      return res
        .status(503)
        .json({ success: false, msg: "Cloud Service not initialized" });
    }
    const stats = cloudSyncService.getStats();
    res.json(stats);
  });

  // GET /api/cloud/candidates
  router.get("/candidates", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    const candidates = cloudSyncService.getCandidates();
    res.json(candidates);
  });

  // POST /api/cloud/candidates/:id/action
  router.post("/candidates/:id/action", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    const { id } = req.params;
    const { action } = req.body; // 'exclude' | 'upload' | 'delete'

    if (!["exclude", "upload", "delete"].includes(action)) {
      return res.status(400).json({ success: false, msg: "Invalid action" });
    }

    cloudSyncService.processCandidate(id, action);
    res.json({ success: true });
  });

  // POST /api/cloud/sync (Force Sync)
  router.post("/sync", async (req: Request, res: Response) => {
    try {
      logger.info("Manual Cloud Sync Triggered");
      cloudSyncService.sync(); // Async (Fire and Forget)
      res.json({ success: true, message: "Sync started" });
    } catch (error: any) {
      logger.error(`[API] Cloud Sync Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cloud/retention (Force Retention Batch)
  router.post("/retention", async (req: Request, res: Response) => {
    try {
      logger.info("Manual Retention Batch Triggered");
      cloudSyncService.runRetentionBatch(); // Async
      res.json({ success: true, message: "Retention Batch started" });
    } catch (error: any) {
      logger.error(`[API] Retention Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cloud/sync/payroll (Force Payroll Sync)
  router.post("/sync/payroll", async (req: Request, res: Response) => {
    try {
      logger.info("Manual Payroll Sync Triggered");
      const result =
        (await cloudSyncService.syncLedgerEntries?.()) ??
        cloudSyncService.sync();
      res.json({ success: true, message: "Payroll sync triggered", result });
    } catch (error: any) {
      logger.error(`[API] Payroll Sync Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/cloud/stats/payroll (Get pending payroll sync stats)
  router.get("/stats/payroll", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    try {
      const stats = cloudSyncService.getLedgerStats?.() ?? {
        error: "Not implemented",
      };
      res.json(stats);
    } catch (error: any) {
      logger.error(`[API] Payroll Stats Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cloud/sync/expenses (Force Expenses Sync)
  router.post("/sync/expenses", async (req: Request, res: Response) => {
    try {
      logger.info("Manual Expenses Sync Triggered");
      const result = (await cloudSyncService.syncExpenses?.()) ?? {
        error: "Not implemented",
      };
      res.json({ success: true, message: "Expenses sync triggered", result });
    } catch (error: any) {
      logger.error(`[API] Expenses Sync Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/cloud/stats/expenses (Get pending expenses sync stats)
  router.get("/stats/expenses", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    try {
      const stats = cloudSyncService.getExpensesStats?.() ?? {
        error: "Not implemented",
      };
      res.json(stats);
    } catch (error: any) {
      logger.error(`[API] Expenses Stats Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cloud/sync/inventory (Force Inventory Sync)
  router.post("/sync/inventory", async (req: Request, res: Response) => {
    try {
      logger.info("Manual Inventory Sync Triggered");
      const result = (await cloudSyncService.syncInventory?.()) ?? {
        error: "Not implemented",
      };
      res.json({ success: true, message: "Inventory sync triggered", result });
    } catch (error: any) {
      logger.error(`[API] Inventory Sync Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/cloud/stats/inventory (Get pending inventory sync stats)
  router.get("/stats/inventory", (req: Request, res: Response) => {
    if (!cloudSyncService) return res.status(503).json({ success: false });
    try {
      const stats = cloudSyncService.getInventoryStats?.() ?? {
        error: "Not implemented",
      };
      res.json(stats);
    } catch (error: any) {
      logger.error(`[API] Inventory Stats Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cloud/heartbeat (Manual Heartbeat)
  router.post("/heartbeat", async (req: Request, res: Response) => {
    try {
      logger.info("Manual Heartbeat Triggered");
      const result = (await cloudSyncService.sendHeartbeat?.()) ?? {
        error: "Not implemented",
      };
      res.json({ success: true, message: "Heartbeat sent", result });
    } catch (error: any) {
      logger.error(`[API] Heartbeat Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/cloud/sync/analytics (Phase 70: Force Analytics Push for a date)
  router.post("/sync/analytics", async (req: Request, res: Response) => {
    try {
      const date =
        (req.query.date as string) || (req.body?.date as string) || undefined;
      logger.info(
        `[API] Phase 70: Manual Analytics Sync triggered${date ? ` for ${date}` : ""}`,
      );
      const result = (await cloudSyncService.syncDailyAnalytics?.(date)) ?? {
        pushed: 0,
        date,
      };
      res.json({ success: true, message: "Analytics sync triggered", result });
    } catch (error: any) {
      logger.error(`[API] Analytics Sync Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/cloud/stats/analytics (Phase 70: Get local analytics snapshot for a date)
  router.get("/stats/analytics", async (req: Request, res: Response) => {
    try {
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];
      // Re-use the same aggregation query as syncDailyAnalytics to show a preview
      const snapshot = context.dbManager.query(
        `SELECT
                   u.id AS photographer_id,
                   u.name AS photographer_name,
                   COUNT(DISTINCT p.id) AS imported_photos,
                   COUNT(CASE WHEN p.quality_flags IS NOT NULL AND p.quality_flags != '[]' AND p.quality_flags != '' THEN 1 END) AS bad_quality_photos,
                   COUNT(DISTINCT o2.id) AS total_customers,
                   COALESCE(SUM(CASE WHEN o2.status = 'Completed' THEN o2.total ELSE 0 END), 0) AS sales_revenue
                 FROM users u
                 LEFT JOIN photos p ON p.photographerId = u.id AND date(p.created_at) = ?
                 LEFT JOIN orders o2 ON o2.photographerId = u.id AND date(o2.created_at) = ?
                 WHERE u.role = 'photographer'
                 GROUP BY u.id
                 HAVING imported_photos > 0 OR total_customers > 0`,
        [date, date],
      );
      res.json({ success: true, date, snapshot });
    } catch (error: any) {
      logger.error(`[API] Analytics Stats Error`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
