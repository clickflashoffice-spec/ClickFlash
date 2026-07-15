import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ALLOWED_COLUMNS } from "../config/constants";
import { validateRequest } from "../utils/validation";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

export default function ordersCollectionRoutes(context: any): Router {
  const { dbManager, logger, auditLogger, realtimeService, orderValidationService, config } = context;
  const router = express.Router();
  const table = "orders";

  // POST Create
  router.post("/", requirePermission(PERMISSIONS.ORDER_CREATE, context.auditLogger), async (req: Request, res: Response) => {
    try {
      let data = { ...req.body };

      const validation = validateRequest(data, table, false);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;

      if (!data.id) data.id = crypto.randomUUID();

      const now = new Date().toISOString();
      data.created_at = now;
      data.updated_at = now;

      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key)) rowData[key] = data[key];
      });

      // SQLite compatibility: stringify JSON arrays
      if (rowData.items && typeof rowData.items !== "string") {
        rowData.items = JSON.stringify(rowData.items);
      }

      const keys = Object.keys(rowData);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => rowData[k]);

      dbManager.run(
        `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
        values
      );

      const savedRecord = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [data.id]);

      if (savedRecord && savedRecord.items && typeof savedRecord.items === "string") {
        try {
          savedRecord.items = JSON.parse(savedRecord.items);
        } catch(e) {}
      }

      // Offline Order Fulfillment (Hot Folders)
      try {
        const importDir = config.UPLOAD_DIR || path.join(config.DATA_DIR, 'uploads');
        const dataDir = path.dirname(importDir);
        const orderNumber = savedRecord.orderNumber || savedRecord.id;
        const orderDir = path.join(dataDir, "orders", `order-${orderNumber}`);

        if (!fs.existsSync(orderDir)) {
          fs.mkdirSync(orderDir, { recursive: true });
        }

        const items = Array.isArray(savedRecord.items) ? savedRecord.items : [];
        for (const item of items) {
          const photoId = item.photoId || (item.photo && item.photo.id);
          if (photoId) {
            const photo = dbManager.get(
              "SELECT url, originalFilename FROM photos WHERE id = ?",
              [photoId]
            ) as { url: string; originalFilename: string } | undefined;
            if (photo && photo.url) {
              const srcPath = path.join(config.WEB_ROOT || "", photo.url.replace('/api/files/', ''));
              if (fs.existsSync(srcPath)) {
                const destName = photo.originalFilename || path.basename(srcPath);
                const destPath = path.join(orderDir, destName);
                fs.copyFile(srcPath, destPath, (err) => {
                  if (err) logger.error(`[HotFolder] Failed to copy photo ${photoId} to ${destPath}`, err);
                });
              }
            }
          }
        }
      } catch (_e: any) {
        logger.warn("[HotFolder] Failed to create offline order folder:", { error: _e.message });
      }

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
      logger.error("Failed to create order", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // PATCH Update
  router.patch("/:id", requirePermission(PERMISSIONS.ORDER_EDIT, context.auditLogger), async (req: Request, res: Response) => {
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

      if (rowData.items && typeof rowData.items !== "string") {
        rowData.items = JSON.stringify(rowData.items);
      }

      const updateKeys = Object.keys(rowData);
      if (updateKeys.length > 0) {
        const setClause = updateKeys.map(k => `${k} = ?`).join(", ");
        const values = updateKeys.map(k => rowData[k]);
        values.push(id);

        dbManager.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
      }

      const savedRecord = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (savedRecord && savedRecord.items && typeof savedRecord.items === "string") {
        try {
          savedRecord.items = JSON.parse(savedRecord.items);
        } catch(e) {}
      }

      // Order Validation Trigger
      if (orderValidationService) {
        const status = (savedRecord.status || "").toLowerCase();
        if (status === "paid" || status === "verified") {
          let albumId = savedRecord.albumId;
          let items = savedRecord.items;
          if (albumId && items) {
            const assetIds = (Array.isArray(items) ? items : []).map(
              (i: any) => (typeof i === "string" ? i : i.photoId || i.id)
            );
            try {
              orderValidationService.validateOrder(id, albumId, assetIds);
            } catch (_e: any) {
              logger.error(`[CollectionRoutes] Validation Trigger Failed ${id}: ${_e.message}`);
            }
          }
        }
      }

      const auditUser = (req as any).session?.user || (req as any).user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        "UPDATE",
        table,
        id
      );

      if (realtimeService && savedRecord) {
        realtimeService.broadcast({ collection: table, action: "update", record: savedRecord });
      }

      res.json(savedRecord);
    } catch (err: any) {
      logger.error("Failed to update order", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // DELETE Order
  router.delete("/:id", requirePermission(PERMISSIONS.ORDER_DELETE, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND", message: `Order record not found` });
      }

      dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

      const auditUser = (req as any).session?.user || (req as any).user;
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
      logger.error("Failed to delete order", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  return router;
}
