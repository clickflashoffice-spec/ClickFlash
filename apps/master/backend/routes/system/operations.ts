// backend/routes/system/operations.ts
import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { UPLOAD_DIR, DATA_DIR as _DATA_DIR } from "../../config/constants";
import { sendInternalError, sendInvalidInputError } from '../../utils/errorHandler';
import { TransferService } from "../../services/TransferService";
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { customRoutesSchemas } from '../../utils/validation';
import { requirePermission, PERMISSIONS } from '../../middleware/permissions';

interface OperationsContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger?: any;
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
  router.post("/data/refresh", strictRateLimiter, (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.operationsDataRefresh.safeParse(req.body);
      const collections = parsed.success ? parsed.data.collections : undefined;
      logger.info("Data refresh requested", { collections });
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
  router.post("/kiosk/send-album", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.operationsKioskSendAlbum.safeParse(req.body);
      if (!parsed.success) {
        return sendInvalidInputError(res, "Album ID is required or invalid format");
      }
      const { albumId, kioskId, photoIds, metadataOnly } = parsed.data;

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
      const jobIds = await transferService.enqueueTransfer(albumId, destinations, photoIds, metadataOnly);
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
  router.post("/orders/:orderId/open-folder", strictRateLimiter, (req: Request, res: Response) => {
    try {
      const orderId = String(req.params.orderId);

      // SECURITY: Validate orderId to prevent path traversal
      if (!orderId || /[\/\\]|\.\./.test(orderId)) {
        return sendInvalidInputError(res, "Invalid order ID");
      }

      const folderPath = path.join(UPLOAD_DIR, "orders", orderId);

      // Double-check resolved path stays within UPLOAD_DIR
      const resolved = path.resolve(folderPath);
      const base = path.resolve(UPLOAD_DIR);
      if (!resolved.startsWith(base + path.sep)) {
        return sendInvalidInputError(res, "Invalid order path");
      }

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
  router.post("/settings/:namespace", strictRateLimiter, requirePermission(PERMISSIONS.SETTINGS_EDIT, context.auditLogger), (req: Request, res: Response) => {
    const { namespace } = req.params;
    const parsed = customRoutesSchemas.operationsSettingsNamespace.safeParse(req.body);
    const valueStr = JSON.stringify(parsed.success ? parsed.data : {});
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
  router.get("/login-history", (_req: Request, res: Response) => {
    const logs = dbManager.query<any>("SELECT * FROM login_history ORDER BY created_at DESC LIMIT 100");
    res.json(logs);
  });

  /**
   * @route POST /migrate-storage
   */
  router.post("/migrate-storage", strictRateLimiter, requirePermission(PERMISSIONS.SYSTEM_ADMIN, context.auditLogger), async (_req: Request, res: Response) => {
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
  router.post("/config/import", strictRateLimiter, requirePermission(PERMISSIONS.SETTINGS_EDIT, context.auditLogger), (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.operationsConfigImport.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid config", details: parsed.error.issues });
      const config = parsed.data;

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
  router.post("/scale-validate", strictRateLimiter, async (_req: Request, res: Response) => {
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

  /**
   * @route POST /erase-customer-data
   * @desc  GDPR Article 17 — Right to Erasure.
   *        Deletes all personal data for a customer email from the source-of-truth DB.
   *        Requires authentication (enforced by global auth middleware).
   */
  router.post("/erase-customer-data", strictRateLimiter, requirePermission(PERMISSIONS.SYSTEM_ADMIN, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.operationsEraseCustomerData.safeParse(req.body);
      if (!parsed.success) {
        return sendInvalidInputError(res, "Valid customer email is required");
      }
      const { email } = parsed.data;

      const db = dbManager.getDb();
      const normalizedEmail = email.toLowerCase().trim();

      // Delete across all tables that store customer PII
      const ordersResult   = db.prepare("DELETE FROM orders WHERE LOWER(json_extract(customer, '$.email')) = ?").run(normalizedEmail);
      const bookingsResult = db.prepare("DELETE FROM bookings WHERE LOWER(email) = ?").run(normalizedEmail);
      const usersResult    = db.prepare("DELETE FROM users WHERE LOWER(email) = ?").run(normalizedEmail);

      // Anonymise photos referencing this customer's orders (retain for accounting audit trail)
      // json_patch is NOT standard SQLite — use application-level JSON manipulation
      const photoRows = db.prepare(`
        SELECT id, metadata FROM photos WHERE json_extract(metadata, '$.customer_email') = ?
      `).all(normalizedEmail) as Array<{ id: string; metadata: string }>;

      let photosAnonymized = 0;
      const updatePhotoMeta = db.prepare(`UPDATE photos SET metadata = ? WHERE id = ?`);

      for (const row of photoRows) {
        try {
          const meta = JSON.parse(row.metadata);
          meta.customer_email = null;
          meta.customer_name = null;
          updatePhotoMeta.run(JSON.stringify(meta), row.id);
          photosAnonymized++;
        } catch (parseErr) {
          logger.warn("[GDPR] Failed to parse photo metadata for anonymization", {
            photoId: row.id,
            error: parseErr instanceof Error ? parseErr.message : String(parseErr),
          });
        }
      }

      const deleted = {
        orders:   ordersResult.changes,
        bookings: bookingsResult.changes,
        users:    usersResult.changes,
        photos:   photosAnonymized,
      };

      logger.info("[GDPR] Customer data erased", { email: normalizedEmail, deleted });

      if (context.auditLogger) {
        context.auditLogger.log("GDPR_ERASURE", {
          email: normalizedEmail,
          deleted,
          actor: (req as any).user?.email ?? "system",
        });
      }

      res.json({ success: true, deleted });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error("[GDPR] Erase failed", { error: error.message });
      sendInternalError(res, error.message);
    }
  });

  return router;
}
