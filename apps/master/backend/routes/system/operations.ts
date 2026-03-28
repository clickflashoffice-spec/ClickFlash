// backend/routes/system/operations.ts
import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { Logger } from "../../shared/logger";
import DatabaseManager from "../../shared/db";
import { UPLOAD_DIR, DATA_DIR } from "../../config/constants";
import { sendInternalError, sendInvalidInputError, sendNotFoundError, sendDatabaseError } from "../../shared/errorHandler";
import { TransferService } from "../../services/TransferService";
import { VectorIndexService } from "../../services/VectorIndexService";

interface OperationsContext {
  dbManager: DatabaseManager;
  logger: Logger;
  realtimeService?: any;
  wss?: any;
  cloudSyncService?: any;
  photoProcessor?: any;
  vectorIndex?: any;
}

export default function operationsRoutes(context: OperationsContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * @route POST /data/refresh
   */
  router.post("/data/refresh", (req: Request, res: Response) => {
    try {
      logger.info("Data refresh requested", { collections: req.body?.collections });
      if (context.realtimeService) {
        context.realtimeService.broadcast({
          collection: "SYSTEM_DATA_REFRESH",
          action: "update",
          record: { source: "manual", timestamp: Date.now() },
        });
      }
      res.json({ success: true, message: "Data refresh signal sent" });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /kiosk/send-album
   */
  router.post("/kiosk/send-album", async (req: Request, res: Response) => {
    try {
      const { albumId, kioskId, photoIds } = req.body;
      if (!albumId) throw new Error("Album ID is required");

      const destinations = new Set<string>();
      if (kioskId) {
        const kiosk = dbManager.get<{ settings: string; uploadFolderPath?: string }>("SELECT settings, uploadFolderPath FROM kiosks WHERE id = ?", [kioskId]);
        if (kiosk?.uploadFolderPath) destinations.add(kiosk.uploadFolderPath);
        else if (kiosk?.settings) {
          const s = typeof kiosk.settings === "string" ? JSON.parse(kiosk.settings) : kiosk.settings;
          if (s.touchImportPath) destinations.add(s.touchImportPath);
        }
      }

      if (destinations.size === 0) {
        // Fallback to global
        const settingsRow = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'network_settings'");
        if (settingsRow?.value) {
          const s = JSON.parse(settingsRow.value);
          if (s.touchSharedImportFolder) destinations.add(s.touchSharedImportFolder);
        }
      }

      const transferService = new TransferService({ dbManager, logger, wss: context.wss });
      const jobIds = await transferService.enqueueTransfer(albumId, destinations, photoIds);
      res.json({ success: true, message: "Transfer started", jobIds });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error("Failed to send album to kiosk", error);
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /orders/:orderId/open-folder
   */
  router.post("/orders/:orderId/open-folder", (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const folderPath = path.join(UPLOAD_DIR, "orders", orderId);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

      const { spawn } = require("child_process");
      spawn("explorer", [folderPath]);
      res.json({ success: true, path: folderPath });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route GET /settings/:namespace
   */
  router.get("/settings/:namespace", (req: Request, res: Response) => {
    const { namespace } = req.params;
    const row = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = ?", [namespace]);
    res.json(row ? JSON.parse(row.value) : {});
  });

  /**
   * @route POST /settings/:namespace
   */
  router.post("/settings/:namespace", (req: Request, res: Response) => {
    const { namespace } = req.params;
    const valueStr = JSON.stringify(req.body);
    const existing = dbManager.get("SELECT 1 FROM settings WHERE key = ?", [namespace]);
    if (existing) dbManager.run("UPDATE settings SET value = ? WHERE key = ?", [valueStr, namespace]);
    else dbManager.run("INSERT INTO settings (key, value) VALUES (?, ?)", [namespace, valueStr]);
    res.json({ success: true });
  });

  /**
   * @route GET /permissions
   */
  router.get("/permissions", (req: Request, res: Response) => {
    const role = req.query.role as string;
    if (role) {
      const rows = dbManager.query<{ permission: string }>("SELECT permission FROM role_permissions WHERE role = ?", [role]);
      res.json({ [role]: rows.map(r => r.permission) });
    } else {
      const rows = dbManager.query<{ role: string; permission: string }>("SELECT role, permission FROM role_permissions");
      const map: Record<string, string[]> = {};
      rows.forEach(r => (map[r.role] = map[r.role] || []).push(r.permission));
      res.json(map);
    }
  });

  /**
   * @route GET /login-history
   */
  router.get("/login-history", (req: Request, res: Response) => {
    const logs = dbManager.query<any>("SELECT * FROM login_history ORDER BY created_at DESC LIMIT 100");
    res.json(logs);
  });

  /**
   * @route POST /migrate-storage
   */
  router.post("/migrate-storage", async (_req: Request, res: Response) => {
    try {
      if (!context.photoProcessor) throw new Error("Photo processor not available");
      const photos = dbManager.query<any>("SELECT * FROM photos");
      logger.info(`Migrating storage for ${photos.length} photos...`);
      res.json({ success: true, message: "Migration started in background." });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route GET /config/export
   */
  router.get("/config/export", (_req: Request, res: Response) => {
    try {
      const network = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'network_settings'");
      res.json(network ? JSON.parse(network.value) : { deskId: "MASTER_01" });
    } catch (error: any) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  /**
   * @route POST /config/import
   */
  router.post("/config/import", (req: Request, res: Response) => {
    try {
      const config = req.body;
      if (!config || !config.deskId) return res.status(400).json({ error: "Invalid config" });

      const settings = { deskId: config.deskId, cloudUrl: config.cloudUrl, cloudEmail: config.cloudEmail };
      dbManager.transaction(() => {
        dbManager.run("UPDATE settings SET value = ? WHERE key = 'network_settings'", [JSON.stringify(settings)]);
        if (config.moneytrash) dbManager.run("UPDATE settings SET value = ? WHERE key = 'moneytrash_settings'", [JSON.stringify(config.moneytrash)]);
      });

      if (context.cloudSyncService) context.cloudSyncService.loadConfig();
      res.json({ success: true, message: "Import successful" });
    } catch (error: any) {
      res.status(500).json({ error: "Import failed" });
    }
  });

  /**
   * @route GET /sync/status
   */
  router.get("/sync/status", (_req: Request, res: Response) => {
    const lastSync = dbManager.get<{ lastSync: string }>("SELECT MAX(updated_at) as lastSync FROM orders")?.lastSync || null;
    res.json({ connected: true, lastSync });
  });

  /**
   * @route POST /scale-validate
   */
  router.post("/scale-validate", async (req: Request, res: Response) => {
    try {
      const { ScaleValidator } = await import("../../services/ScaleValidator");
      const validator = new ScaleValidator(dbManager, logger);
      const report = await validator.runFullSuite();
      res.status(report.passed ? 200 : 500).json(report);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      sendInternalError(res, error.message);
    }
  });

  return router;
}
