import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import { ALLOWED_COLUMNS } from "../config/constants";
import { validateRequest } from "../utils/validation";
import { requirePermission, PERMISSIONS } from "../middleware/permissions";

// Helper to hash password
function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ":" + derivedKey.toString("hex"));
    });
  });
}

export default function usersRoutes(context: any): Router {
  const { dbManager, logger, auditLogger, realtimeService } = context;
  const router = express.Router();
  const table = "users";

  // POST Create
  router.post("/", requirePermission(PERMISSIONS.USER_CREATE, context.auditLogger), async (req: Request, res: Response) => {
    try {
      let data = { ...req.body };

      const validation = validateRequest(data, table, false);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;
      
      // Hash password
      if (data.password) {
        data.password = await hashPassword(data.password);
      }

      // Timestamps
      const now = new Date().toISOString();
      data.created_at = now;
      data.updated_at = now;

      // Filter allowed columns
      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key)) rowData[key] = data[key];
      });

      const keys = Object.keys(rowData);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const values = keys.map(k => rowData[k]);

      const info = dbManager.run(
        `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
        values
      );

      const id = data.id || info.lastInsertRowid;
      const savedRecord = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);

      // Remove password from response
      if (savedRecord && savedRecord.password) delete savedRecord.password;

      // Audit Log
      const auditUser = (req as any).session?.user || (req as any).user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        "CREATE",
        table,
        id
      );

      // Realtime
      if (realtimeService && savedRecord) {
        realtimeService.broadcast({ collection: table, action: "create", record: savedRecord });
      }

      res.status(201).json(savedRecord);
    } catch (err: any) {
      logger.error("Failed to create user", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // PATCH Update
  router.patch("/:id", requirePermission(PERMISSIONS.USER_EDIT, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      let data = { ...req.body };

      const validation = validateRequest(data, table, true);
      if (!validation.success) {
        return res.status(400).json({ error: "VALIDATION_FAILED", message: validation.error, details: validation.details });
      }
      data = validation.data;
      
      if (data.password) {
        data.password = await hashPassword(data.password);
      }
      
      data.updated_at = new Date().toISOString();

      const allowedCols = ALLOWED_COLUMNS[table] || [];
      const rowData: Record<string, any> = {};
      Object.keys(data).forEach(key => {
        if (allowedCols.includes(key) && key !== "id") rowData[key] = data[key];
      });

      const updateKeys = Object.keys(rowData);
      if (updateKeys.length > 0) {
        const setClause = updateKeys.map(k => `${k} = ?`).join(", ");
        const values = updateKeys.map(k => rowData[k]);
        values.push(id);

        dbManager.run(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
      }

      const savedRecord = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (savedRecord && savedRecord.password) delete savedRecord.password;

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
      logger.error("Failed to update user", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  // DELETE User
  router.delete("/:id", requirePermission(PERMISSIONS.USER_DELETE, context.auditLogger), async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (!existing) {
        return res.status(404).json({ error: "NOT_FOUND", message: `User record not found` });
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
      logger.error("Failed to delete user", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  });

  return router;
}
