import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import { ALLOWED_COLUMNS } from "../config/constants";
import { validateRequest } from "../utils/validation";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

export default function albumsRoutes(context: any): Router {
  const { dbManager, logger, auditLogger, realtimeService, dbWriteQueue } = context;
  const router = express.Router();
  const table = "albums";

  // POST Create
  router.post("/", requirePermission(PERMISSIONS.ALBUM_CREATE, context.auditLogger), async (req: Request, res: Response) => {
    try {
      let data = { ...req.body };

      const validation = validateRequest(data, table, false);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;

      // Data integrity checks before save
      if (data.photographerId && data.photographerId !== "undefined" && data.photographerId !== "null" && data.photographerId !== "") {
        const pId = !isNaN(Number(data.photographerId)) ? Number(data.photographerId) : data.photographerId;
        const photographerExists = dbManager.get(
          `SELECT 1 FROM users WHERE id = ?`,
          [pId]
        );
        if (photographerExists) {
          data.photographerId = pId;
        } else {
          data.photographerId = null;
        }
      } else {
        data.photographerId = null;
      }

      if (!data.id) data.id = crypto.randomUUID();

      const now = new Date().toISOString();
      data.created_at = now;
      data.updated_at = now;

      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key)) {
          const val = data[key];
          if (val !== undefined) {
            if (typeof val === "boolean") {
              rowData[key] = val ? 1 : 0;
            } else if (typeof val === "object" && val !== null && !Buffer.isBuffer(val)) {
              rowData[key] = JSON.stringify(val);
            } else {
              rowData[key] = val;
            }
          }
        }
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

      const auditUser = req.session?.user || req.user;
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
      logger.error("Failed to create album", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // PATCH Update
  router.patch("/:id", requirePermission(PERMISSIONS.ALBUM_EDIT, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      let data = { ...req.body };

      const validation = validateRequest(data, table, true);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;
      
      if (data.photographerId !== undefined) {
        if (data.photographerId && data.photographerId !== "undefined" && data.photographerId !== "null" && data.photographerId !== "") {
          const pId = !isNaN(Number(data.photographerId)) ? Number(data.photographerId) : data.photographerId;
          const photographerExists = dbManager.get(
            `SELECT 1 FROM users WHERE id = ?`,
            [pId]
          );
          if (photographerExists) {
            data.photographerId = pId;
          } else {
            data.photographerId = null;
          }
        } else {
          data.photographerId = null;
        }
      }

      data.updated_at = new Date().toISOString();

      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key) && key !== "id") {
          const val = data[key];
          if (val !== undefined) {
            if (typeof val === "boolean") {
              rowData[key] = val ? 1 : 0;
            } else if (typeof val === "object" && val !== null && !Buffer.isBuffer(val)) {
              rowData[key] = JSON.stringify(val);
            } else {
              rowData[key] = val;
            }
          }
        }
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

      const auditUser = req.session?.user || req.user;
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
      logger.error("Failed to update album", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // GET DeepThink & Search Ideas Inspiration
  router.get("/:id/inspiration", requirePermission(PERMISSIONS.ALBUM_EDIT, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { DeepThinkService } = require("../services/deepThinkService");
      const deepThinkService = new DeepThinkService(dbManager);
      const report = await deepThinkService.getInspirationForAlbum(id);
      res.json(report);
    } catch (err: any) {
      logger.error(`[DeepThinkEndpoint] Failed to get inspiration for album ${req.params.id}:`, err);
      res.status(500).json({ error: "INSPIRATION_ERROR", message: err.message });
    }
  });

  // DELETE Album
  router.delete("/:id", requirePermission(PERMISSIONS.ALBUM_DELETE, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND", message: `Album record not found` });
      }

      dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

      const auditUser = req.session?.user || req.user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        "DELETE",
        table,
        id
      );

      if (realtimeService) {
        realtimeService.broadcast({ collection: table, action: "delete", record: { id, collectionName: table } });
      }

      res.json({ success: true, id });
    } catch (err: any) {
      logger.error("Failed to delete album", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  return router;
}
