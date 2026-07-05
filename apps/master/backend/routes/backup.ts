/**
 * Backup / Restore API routes — admin-only.
 *
 * GET  /api/backup/export   → streams a .clickflash-backup zip
 * POST /api/backup/restore  → accepts raw zip body, replaces DB + uploads
 *
 * Restore usage:
 *   curl -X POST /api/backup/restore \
 *        -H "Content-Type: application/octet-stream" \
 *        --data-binary @backup.clickflash-backup
 *
 * (Frontend can also use fetch with body = File object and the same Content-Type.)
 */

import express, { Request, Response, Router } from "express";
import { BackupService } from "../services/BackupService";
import { Logger } from '../utils/logger';
import { DatabaseManager } from '../database/db';
import { DB_FILE, UPLOAD_DIR } from "../config/constants";

export interface BackupRouteContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

export default function backupRoutes(context: BackupRouteContext): Router {
  const { logger } = context;
  const router = express.Router();
  const backupService = new BackupService(DB_FILE, UPLOAD_DIR, logger);

  /**
   * GET /api/backup/export
   * Streams a complete backup archive as a downloadable file.
   * Auth enforced by authMiddleware mounted upstream in server.ts.
   */
  router.get("/export", async (req: Request, res: Response) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `clickflash-backup-${timestamp}.clickflash-backup`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("X-Backup-Timestamp", new Date().toISOString());
      // Don't buffer — stream directly to client
      res.setHeader("Transfer-Encoding", "chunked");

      logger.info("[Backup] Starting export stream", { ip: req.ip });

      await backupService.streamExport(res);
    } catch (err: any) {
      logger.error("[Backup] Export failed", { error: err.message });
      if (!res.headersSent) {
        res.status(500).json({ error: "Backup export failed: " + err.message });
      }
    }
  });

  /**
   * POST /api/backup/restore
   * Body: raw binary (Content-Type: application/octet-stream), up to 200 MB.
   * Returns 200 with warnings list on success; server restart is required after.
   */
  router.post(
    "/restore",
    express.raw({ type: "*/*", limit: "200mb" }),
    async (req: Request, res: Response) => {
      try {
        const body = req.body as Buffer;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          return res.status(400).json({
            error: "No backup data received. Send the .clickflash-backup file as raw binary body.",
          });
        }

        logger.warn("[Backup] Restore requested", {
          ip: req.ip,
          sizeBytes: body.length,
        });

        const warnings = await backupService.restore(body);

        logger.warn("[Backup] Restore complete — server restart required");

        res.json({
          success: true,
          message: "Restore successful. Please restart the application to apply changes.",
          warnings,
        });
      } catch (err: any) {
        logger.error("[Backup] Restore failed", { error: err.message });
        res.status(400).json({ error: err.message });
      }
    },
  );

  return router;
}
