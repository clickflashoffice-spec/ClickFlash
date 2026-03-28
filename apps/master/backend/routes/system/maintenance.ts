// backend/routes/system/maintenance.ts
import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import { Logger } from "../../shared/logger";
import DatabaseManager from "../../shared/db";
import { IMPORT_DIR, DATA_DIR, BACKUP_DIR, LOGS_DIR } from "../../config/constants";
import { sendInternalError } from "../../shared/errorHandler";

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
  router.post("/cleanup", (req: Request, res: Response) => {
    let retentionDays = 30;
    if (req.body?.masterImportRetentionDays) {
      retentionDays = Number(req.body.masterImportRetentionDays);
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
  router.post("/vacuum", (_req: Request, res: Response) => {
    try {
      dbManager.maintenance();
      res.json({ success: true, message: "Database optimized." });
    } catch (error) {
      sendInternalError(res, error.message);
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
    } catch (error) {
      res.status(500).json({ error: error.message });
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @route POST /rebuild
   */
  router.post("/rebuild", async (_req: Request, res: Response) => {
    try {
      dbManager.transaction(() => {
        dbManager.exec("REINDEX");
        dbManager.exec("ANALYZE");
      });
      res.json({ success: true, message: "System indices rebuilt." });
    } catch (error) {
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /backup
   */
  router.post("/backup", async (_req: Request, res: Response) => {
    try {
      const backupDir = BACKUP_DIR;
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(backupDir, `master-${timestamp}.db`);

      // Better-sqlite3 clean backup
      dbManager.getDb().exec(`VACUUM INTO '${backupFile.replace(/\\/g, "/")}'`);
      res.json({ success: true, path: backupFile });
    } catch (error) {
      sendInternalError(res, error.message);
    }
  });

  /**
   * @route POST /reset
   */
  router.post("/reset", (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || user.role !== "Admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      logger.warn(`FACTORY RESET INITIATED by ${user.email}`);
      dbManager.transaction(() => {
        ["photos", "albums", "orders", "order_items", "kiosks"].forEach(t => {
          dbManager.run(`DELETE FROM ${t}`);
          dbManager.run(`DELETE FROM sqlite_sequence WHERE name='${t}'`);
        });
      });
      res.json({ success: true, message: "Reset complete. Restart required." });
    } catch (error) {
      sendInternalError(res, error.message);
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
