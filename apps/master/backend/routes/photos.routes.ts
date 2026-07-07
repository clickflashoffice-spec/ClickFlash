import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import { ALLOWED_COLUMNS } from "../config/constants";
import { validateRequest } from "../utils/validation";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

export default function photosRoutes(context: any): Router {
  const { dbManager, logger, auditLogger, realtimeService, dbWriteQueue } = context;
  const router = express.Router();
  const table = "photos";

  // POST Create
  router.post("/", requirePermission(PERMISSIONS.PHOTO_UPLOAD, context.auditLogger), async (req: Request, res: Response) => {
    try {
      let data = { ...req.body };

      const validation = validateRequest(data, table, false);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;
      
      // Foreign key checks
      if (data.albumId) {
        const albumIdCheck = String(data.albumId);
        const albumExists = dbManager.get(
          `SELECT 1 FROM albums WHERE id = ?`,
          [albumIdCheck]
        );

        if (!albumExists) {
          logger.warn(`[FK] Album ${albumIdCheck} not found — returning 422 so client can retry.`);
          return res.status(422).json({
            error: "ALBUM_NOT_FOUND",
            message: `Album '${albumIdCheck}' does not exist yet — please retry`,
            retryable: true,
          });
        }
      }

      if (data.photographerId) {
        const photographerExists = dbManager.get(
          `SELECT 1 FROM users WHERE id = ?`,
          [data.photographerId]
        );
        if (!photographerExists) {
          return res.status(400).json({
            error: "INVALID_INPUT",
            message: `Photographer with ID '${data.photographerId}' does not exist on [MASTER].`
          });
        }
      }

      if (!data.id) data.id = crypto.randomUUID();

      const now = new Date().toISOString();
      data.created_at = now;
      data.updated_at = now;

      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key)) rowData[key] = data[key];
      });

      const keys = Object.keys(rowData);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => rowData[k]);

      dbManager.run(
        `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
        values
      );

      const savedRecord = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [data.id]);

      // Auto-cover photo
      try {
        const albumId = rowData.albumId;
        if (albumId) {
          const album = dbManager.get(
            "SELECT coverPhotoUrl FROM albums WHERE id = ?",
            [albumId]
          ) as { coverPhotoUrl: string } | undefined;
          if (album && !album.coverPhotoUrl) {
            const photoUrl = rowData.thumbnailUrl || rowData.previewUrl || rowData.url;
            if (photoUrl) {
              dbManager.run(
                "UPDATE albums SET coverPhotoUrl = ?, updated_at = ? WHERE id = ?",
                [photoUrl, now, albumId]
              );
              logger.info(`[AutoCover] Automatically set cover photo for album ${albumId}: ${photoUrl}`);

              if (realtimeService) {
                const updatedAlbum = dbManager.get("SELECT * FROM albums WHERE id = ?", [albumId]);
                if (updatedAlbum) {
                  realtimeService.broadcast({
                    collection: "albums",
                    action: "update",
                    record: updatedAlbum,
                  });
                }
              }
            }
          }
        }
      } catch (_e: any) {
        logger.warn("[AutoCover] Failed to update album cover:", { error: _e.message });
      }

      // ── Dynamic Branding / Watermark Engine ─────────────────────────────
      // Hook into the ingestion pipeline so that immediately after a photo is ingested,
      // if a watermark rule matches, the image is composited.
      try {
        const cameraId = rowData.camera_id || null;
        let configQuery = `SELECT * FROM watermark_configs WHERE is_active = 1 AND (target_camera_id = ? OR target_camera_id IS NULL OR target_camera_id = '') ORDER BY target_camera_id DESC LIMIT 1`;
        const wmConfig = dbManager.get(configQuery, [cameraId]);

        if (wmConfig && rowData.albumId) {
          const { PhotoProcessor } = require("../services/photoProcessor");
          const UPLOAD_DIR = require("path").resolve(process.cwd(), "uploads");
          const photoProcessor = new PhotoProcessor(UPLOAD_DIR, null, dbManager);

          // Find the source photo path to watermark
          // Attempt to find the full path. rowData.url looks like /uploads/albumId/highres/filename.jpg
          const fs = require("fs");
          const path = require("path");
          
          let highResPath;
          if (rowData.url && rowData.url.includes("/highres/")) {
            const relPath = rowData.url.replace("/uploads/", "");
            highResPath = path.join(UPLOAD_DIR, relPath);
          } else {
             // Fallback inference
             highResPath = path.join(UPLOAD_DIR, rowData.albumId, "highres", `${data.id}.jpg`);
          }

          if (fs.existsSync(highResPath)) {
            const outputDir = path.join(UPLOAD_DIR, rowData.albumId, "thumbs");
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            logger.info(`[WatermarkEngine] Applying watermark config ${wmConfig.name} to photo ${data.id}`);
            await photoProcessor.generateWatermark(highResPath, outputDir, {
              overlayPath: wmConfig.overlay_path,
              opacity: wmConfig.opacity,
              scale: wmConfig.scale,
              position: wmConfig.position
            });

            // Update photo record to point to watermarked preview if necessary
            // Or the client can just request the `_preview_wm.webp` using Smart Resolution
          } else {
            logger.warn(`[WatermarkEngine] HighRes path not found for watermarking: ${highResPath}`);
          }
        }
      } catch (wmError: any) {
        logger.error(`[WatermarkEngine] Failed to apply watermark to photo ${data.id}:`, wmError);
      }
      // ──────────────────────────────────────────────────────────────────────


      const auditUser = (req as any).session?.user || (req as any).user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        "CREATE",
        table,
        data.id
      );

      if (realtimeService && savedRecord) {
        realtimeService.broadcast({ collection: table, action: "create", record: savedRecord });
      }

      res.status(201).json(savedRecord);
    } catch (err: any) {
      logger.error("Failed to create photo", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // PATCH Update
  router.patch("/:id", requirePermission(PERMISSIONS.PHOTO_EDIT, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      let data = { ...req.body };

      const validation = validateRequest(data, table, true);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;
      
      data.updated_at = new Date().toISOString();

      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key) && key !== "id") rowData[key] = data[key];
      });

      let saved: any;

      if (dbWriteQueue) {
        // Zero-Block IO Optimization for Updates
        const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        if (!existing) {
          return res.status(404).json({ error: "NOT_FOUND", message: `${table} record not found` });
        }

        const updateData = { ...rowData };
        delete updateData.id;
        await dbWriteQueue.enqueue(table, id, updateData);

        saved = { ...existing, ...rowData };
        logger.info(`[ZeroBlock] Deferred update for ${table}:${id}`);
      } else {
        const updateKeys = Object.keys(rowData);
        if (updateKeys.length > 0) {
          const setClause = updateKeys.map(k => `${k} = ?`).join(", ");
          const values = updateKeys.map(k => rowData[k]);
          values.push(id);

          dbManager.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
        }
        saved = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      }

      const auditUser = (req as any).session?.user || (req as any).user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        "UPDATE",
        table,
        id
      );

      if (realtimeService && saved) {
        realtimeService.broadcast({ collection: table, action: "update", record: saved });
      }

      res.json(saved);
    } catch (err: any) {
      logger.error("Failed to update photo", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  return router;
}
