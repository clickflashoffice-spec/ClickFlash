// backend/routes/system/maintenance.ts
import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { IMPORT_DIR, DATA_DIR as _DATA_DIR, BACKUP_DIR, LOGS_DIR } from "../../config/constants";
import { sendInternalError } from '../../utils/errorHandler';
import { strictRateLimiter } from '../../middleware/rateLimiter';
import { customRoutesSchemas } from '../../utils/validation';

interface MaintenanceContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

export default function maintenanceRoutes(context: MaintenanceContext): Router {
  const { dbManager, logger } = context;
  const router = express.Router();

  /**
   * @route POST /cleanup
   */
  router.post("/cleanup", strictRateLimiter, (req: Request, res: Response) => {
    let retentionDays = 30;
    const parsed = customRoutesSchemas.maintenanceCleanup.safeParse(req.body);
    if (parsed.success && parsed.data.masterImportRetentionDays) {
      retentionDays = Number(parsed.data.masterImportRetentionDays);
    } else {
      const row = dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'data_management_settings'");
      if (row) {
        try {
          const config = JSON.parse(row.value);
          if (config.masterImportRetentionDays) retentionDays = Number(config.masterImportRetentionDays);
        } catch (e) { /* ignore */ }
      }
    }

    if (fs.existsSync(IMPORT_DIR)) {
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      const walkAndClean = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          const filePath = path.join(dir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              walkAndClean(filePath);
              if (fs.readdirSync(filePath).length === 0) fs.rmdirSync(filePath);
            } else if (now - stat.mtimeMs > retentionMs) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          } catch (e) { /* ignore single file errors */ }
        });
      };
      walkAndClean(IMPORT_DIR);
      logger.info("Cleanup completed", { deletedCount });
      res.json({ success: true, message: `Cleanup completed. ${deletedCount} removed.` });
    } else {
      res.json({ success: true, message: "Nothing to clean." });
    }
  });

  /**
   * @route POST /vacuum
   */
  router.post("/vacuum", strictRateLimiter, (_req: Request, res: Response) => {
    try {
      dbManager.maintenance();
      res.json({ success: true, message: "Database optimized." });
    } catch (error: any) {
      sendInternalError(res, error instanceof Error ? error : new Error(String(error)), "vacuum");
    }
  });

  /**
   * @route GET /logs
   */
  router.get("/logs", (_req: Request, res: Response) => {
    try {
      if (!fs.existsSync(LOGS_DIR)) return res.json({ logs: [] });
      const files = fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith(".log"))
        .map(f => ({ name: f, size: fs.statSync(path.join(LOGS_DIR, f)).size }));
      res.json({ logs: files });
    } catch (error: any) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * @route GET /backups
   */
  router.get("/backups", (_req: Request, res: Response) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return res.json({ backups: [] });
      const files = fs.readdirSync(BACKUP_DIR)
        .map(f => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }));
      res.json({ backups: files });
    } catch (error: any) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * @route POST /rebuild
   */
  router.post("/rebuild", strictRateLimiter, async (_req: Request, res: Response) => {
    try {
      dbManager.transaction(() => {
        dbManager.exec("REINDEX");
        dbManager.exec("ANALYZE");
      });
      res.json({ success: true, message: "System indices rebuilt." });
    } catch (error: any) {
      sendInternalError(res, error instanceof Error ? error : new Error(String(error)), "rebuild");
    }
  });

  /**
   * @route POST /backup
   */
  router.post("/backup", strictRateLimiter, async (_req: Request, res: Response) => {
    try {
      const backupDir = BACKUP_DIR;
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(backupDir, `master-${timestamp}.db`);

      // Better-sqlite3 clean backup
      dbManager.getDb().exec(`VACUUM INTO '${backupFile.replace(/\\/g, "/")}'`);
      res.json({ success: true, path: backupFile });
    } catch (error: any) {
      sendInternalError(res, error instanceof Error ? error : new Error(String(error)), "backup");
    }
  });

  /**
   * @route POST /reset
   */
  router.post("/reset", strictRateLimiter, (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "Admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      logger.warn(`FACTORY RESET INITIATED by ${user.email}`);
      dbManager.transaction(() => {
        ["photo_faces", "face_indexing_queue", "photos", "albums", "orders", "order_items", "kiosks"].forEach(t => {
          dbManager.run(`DELETE FROM ${t}`);
          dbManager.run(`DELETE FROM sqlite_sequence WHERE name='${t}'`);
        });
      });
      res.json({ success: true, message: "Reset complete. Restart required." });
    } catch (error: any) {
      sendInternalError(res, error instanceof Error ? error : new Error(String(error)), "reset");
    }
  });

  /**
   * @route POST /erase-customer-data
   * GDPR Article 17 — Right to erasure ("right to be forgotten")
   * Deletes all PII associated with a customer email: orders, face data, gallery tokens.
   */
  router.post("/erase-customer-data", (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "Admin") {
        return res.status(403).json({ error: "Unauthorized — admin only" });
      }

      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.trim().toLowerCase();
      logger.warn(`[GDPR] Data erasure requested for: ${normalizedEmail} by ${user.email}`);

      const result = dbManager.transaction(() => {
        // 1. Find all orders by this customer
        const orders = dbManager.query<{ id: string; albumId: string }>(
          `SELECT id, albumId FROM orders WHERE LOWER(TRIM(email)) = ? OR LOWER(TRIM(customerEmail)) = ?`,
          [normalizedEmail, normalizedEmail]
        );

        // 2. Find all photos linked to those albums for face data cleanup
        const albumIds = [...new Set(orders.map(o => o.albumId).filter(Boolean))];
        let facesDeleted = 0;
        for (const albumId of albumIds) {
          const r = dbManager.run(
            `DELETE FROM photo_faces WHERE photoId IN (SELECT id FROM photos WHERE albumId = ?)`,
            [albumId]
          );
          facesDeleted += r.changes || 0;
          dbManager.run(
            `DELETE FROM face_indexing_queue WHERE photoId IN (SELECT id FROM photos WHERE albumId = ?)`,
            [albumId]
          );
        }

        // 3. Anonymize order records (keep for accounting, strip PII)
        const orderUpdate = dbManager.run(
          `UPDATE orders SET email = '[erased]', customerEmail = '[erased]', customerName = '[erased]', phone = '[erased]' WHERE LOWER(TRIM(email)) = ? OR LOWER(TRIM(customerEmail)) = ?`,
          [normalizedEmail, normalizedEmail]
        );

        // 4. Delete gallery tokens
        const tokenDelete = dbManager.run(
          `DELETE FROM gallery_tokens WHERE LOWER(email) = ?`,
          [normalizedEmail]
        );

        return {
          ordersAnonymized: orderUpdate.changes || 0,
          facesDeleted,
          tokensDeleted: tokenDelete.changes || 0,
        };
      });

      logger.info(`[GDPR] Erasure complete for ${normalizedEmail}`, result);
      res.json({ success: true, ...result });
    } catch (error: any) {
      logger.error("[GDPR] Erasure failed:", error);
      sendInternalError(res, error instanceof Error ? error : new Error(String(error)), "erase-customer-data");
    }
  });

  /**
   * @route GET /db-stats
   */
  router.get("/db-stats", (_req: Request, res: Response) => {
    try {
      const tables = ["photos", "albums", "orders", "users"];
      const rowCounts: Record<string, number> = {};
      tables.forEach(t => {
        try { rowCounts[t] = dbManager.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${t}`)?.c || 0; }
        catch { rowCounts[t] = -1; }
      });
      res.json({ rowCounts, engine: "better-sqlite3-multiple-ciphers" });
    } catch (error: any) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
}
