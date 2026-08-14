// backend/routes/system/network.ts
import express, { Request, Response, Router } from "express";
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { sendInternalError } from '../../utils/errorHandler';
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { customRoutesSchemas } from '../../utils/validation';
interface NetworkContext {
  dbManager: DatabaseManager;
  logger: Logger;
  networkMonitor?: any;
  cloudSyncService?: any;
}

export default function networkRoutes(context: NetworkContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * @route GET /stats
   */
  router.get("/stats", (_req: Request, res: Response) => {
    try {
      if (!context.networkMonitor) {
        return res.status(503).json({ success: false, message: "Network monitor not initialized" });
      }
      res.json({
        success: true,
        timestamp: Date.now(),
        ...context.networkMonitor.getStats(),
      });
    } catch (error: any) {
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route GET /diagnostics
   */
  router.get("/diagnostics", (_req: Request, res: Response) => {
    try {
      const { NetworkMonitor } = require("../../services/NetworkMonitor");
      const stats = context.networkMonitor?.getStats() || {};
      const perClient = context.networkMonitor?.getPerClientStats() || [];
      const recentErrors = context.networkMonitor?.getRecentErrors(20) || [];
      const interfaces = NetworkMonitor.getInterfaceSnapshot();
      const system = NetworkMonitor.getSystemSnapshot();

      res.json({
        success: true,
        timestamp: Date.now(),
        transfer: stats,
        perClient,
        recentErrors,
        interfaces,
        system,
      });
    } catch (error: any) {
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /ping
   */
  router.post("/ping", strictRateLimiter, (req: Request, res: Response) => {
    const parsed = customRoutesSchemas.networkPing.safeParse(req.body);
    const clientTs = (parsed.success && parsed.data.clientTimestamp) ? parsed.data.clientTimestamp : 0;
    const serverTs = Date.now();
    res.json({
      success: true,
      clientTimestamp: clientTs,
      serverTimestamp: serverTs,
      rttEstimateMs: clientTs ? serverTs - clientTs : null,
    });
  });

  /**
   * @route GET /settings
   */
  router.get("/settings", (_req: Request, res: Response) => {
    try {
      const networkSettings = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'network_settings'",
      );
      const moneytrashSettings = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'moneytrash_settings'",
      );

      let response = {};
      if (networkSettings && networkSettings.value) {
        response = JSON.parse(networkSettings.value);
      }

      if (moneytrashSettings && moneytrashSettings.value) {
        (response as any).moneytrash = JSON.parse(moneytrashSettings.value);
      }

      res.json(response);
    } catch (error: any) {
      logger.error("Failed to get network settings", error);
      res.status(500).json({ error: "Failed to retrieve network settings" });
    }
  });

  /**
   * @route POST /settings
   */
  router.post("/settings", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.networkSettings.safeParse(req.body);
      const settings = parsed.success ? parsed.data : {};

      // Individual keys to save
      const keysToSave: Record<string, any> = {
        masterLocalIPAddress: settings.masterLocalIp,
        touchSharedImportFolder: settings.touchSharedImportFolder,
        connectionMode: settings.connectionMode,
        desk_id: settings.deskId,
        cloud_email: settings.cloudEmail,
        cloud_password: settings.cloudPassword,
        cloud_url: settings.cloudUrl,
        network_settings: JSON.stringify(settings),
        moneytrash_settings: settings.moneytrash ? JSON.stringify(settings.moneytrash) : undefined,
      };

      Object.entries(keysToSave).forEach(([key, value]) => {
        if (value !== undefined) {
          const existing = dbManager.get("SELECT 1 FROM settings WHERE key = ?", [key]);
          const valStr = typeof value === "object" ? JSON.stringify(value) : String(value);
          if (existing) {
            dbManager.run("UPDATE settings SET value = ? WHERE key = ?", [valStr, key]);
          } else {
            dbManager.run(
              "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
              [key, valStr, new Date().toISOString(), new Date().toISOString()]
            );
          }
        }
      });

      if (context.cloudSyncService) {
        context.cloudSyncService.loadConfig();
      }

      res.json({ success: true, message: "Network settings saved" });
    } catch (error: any) {
      logger.error("Failed to save network settings", error);
      sendInternalError(res, error.message);
    }
  });

  return router;
}
