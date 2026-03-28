// backend/routes/collections.ts
// Collections Routes (Generic CRUD)

import express, { Request, Response, Router, NextFunction } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import formidable from "formidable";
import { validateRequest } from "../shared/validation";
import { hashPassword } from "../shared/auth";
import {
  sendError,
  sendValidationError,
  sendInvalidInputError,
  sendDatabaseError,
  sendNotFoundError,
  sendFileError,
  ERROR_CODES,
} from "../shared/errorHandler";
import {
  TABLE_MAP,
  COLUMN_MAP,
  ALLOWED_COLUMNS,
  JSON_COLUMNS,
  IMPORT_DIR,
} from "../config/constants";
import DatabaseManager from "../shared/db";
import { Logger } from "../shared/logger";
import AuditLogger from "../shared/auditLogger";
import { PhotoProcessor } from "../shared/photoProcessor";
import RealtimeService from "../services/realtimeService";
import { OrderValidationService } from "../services/OrderValidationService";

import { DbWriteQueue } from "../services/DbWriteQueue";

// Define context interface
interface CollectionsContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger: AuditLogger;
  photoProcessor: PhotoProcessor;
  realtimeService?: RealtimeService;
  orderValidationService?: OrderValidationService;
  dbWriteQueue?: DbWriteQueue;
  config: any;
}

// Extend Request to include table/collection
interface CollectionRequest extends Request {
  table: string;
  collection: string;
}

// Debug logger helper (removed unused)

export default function collectionRoutes(context: CollectionsContext): Router {
  const { dbManager, logger, auditLogger, photoProcessor, dbWriteQueue } =
    context;
  const router = express.Router();

  const checkSensitiveFields = (req: Request, table: string, data: any) => {
    // Prevent modification of sensitive fields by non-admins
    if (table === "users") {
      const user = (req as any).session?.user || (req as any).user;
      const isAdmin = user?.role === "Admin" || user?.role === "CEO";

      // Non-admins cannot change roles or permissions
      if (!isAdmin) {
        if (data.role) delete data.role;
        if (data.permissions) delete data.permissions;
        // Users can only change their own password (handled by ID check usually, but here we scrub fields)
      }
    }
  };

  const processRecordCreation = async (
    req: Request,
    res: Response,
    table: string,
    data: any,
    pathName: string,
  ) => {
    const saveStartTime = Date.now();
    const reqWithTable = req as CollectionRequest;

    try {
      // Security: Enforce RBAC on sensitive fields
      checkSensitiveFields(req, table, data);

      if (
        table === "users" ||
        table === "destinations" ||
        table === "orders" ||
        table === "albums"
      ) {
        logger.info(`Processing ${table} update/create`, {
          method: req.method,
          hasId: !!data.id,
          id: data.id,
          dataKeys: Object.keys(data),
          endpoint: pathName,
          data:
            table === "users"
              ? { ...data, password: data.password ? "[HIDDEN]" : undefined }
              : data,
        });
      }

      // Determine if this is an update (PATCH) or create (POST)
      let isUpdate = req.method === "PATCH";
      if (!isUpdate && data.id) {
        const exists = dbManager.get(
          `SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`,
          [data.id],
        );
        if (exists) isUpdate = true;
      }

      // Validate request body - use partial schema for updates
      if (table === "photos") {
        logger.debug(
          `[Collections] photo record operation. Method: ${req.method}`,
          { albumId: data.albumId, keys: Object.keys(data) }
        );
      }

      const validation = validateRequest(data, table, isUpdate);
      if (!validation.success) {
        if (table === "photos") {
          logger.warn(`[Collections] Photo validation failed`, {
            details: validation.details,
          });
        }
        logger.error("Validation failed", {
          table,
          error: validation.error,
          details: validation.details,
          data:
            table === "users"
              ? { ...data, password: data.password ? "[HIDDEN]" : undefined }
              : data,
          endpoint: pathName,
        });
        sendValidationError(
          res,
          `Validation failed for ${table} record: ${validation.error}`,
          validation.details,
        );
        return;
      }

      if (table === "kiosks") {
        logger.info("[DEBUG] Validation Output:", {
          validOrdersPath: validation.data.ordersFolderPath,
        });
      }

      const validData = validation.data;
      // Generate UUID for tables that use text IDs, skip for auto-increment (users)
      if (!validData.id && table !== "users")
        validData.id = crypto.randomUUID();

      // Data integrity checks before save
      // Check foreign key constraints
      if (table === "photos") {
        if (validData.albumId) {
          // RACE CONDITION DEFENSE: Centralized Album existence retry loop
          let albumExists = null;
          const albumIdCheck = String(validData.albumId);

          for (let i = 0; i < 25; i++) {
            albumExists = dbManager.get(`SELECT 1 FROM albums WHERE id = ?`, [
              albumIdCheck,
            ]);
            if (albumExists) {
              if (i > 0)
                logger.warn(
                  `[RaceDefense] Album ${albumIdCheck} found after ${i} retries (JSON/Central Path).`,
                );
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          if (!albumExists) {
            logger.error(
              `[RaceDefense] Album ${albumIdCheck} NOT FOUND after 5s retry loop.`,
            );
            sendInvalidInputError(
              res,
              `Album with ID '${albumIdCheck}' does not exist on [MASTER].`,
            );
            return;
          }
        }
        if (validData.photographerId) {
          const photographerExists = dbManager.get(
            `SELECT 1 FROM users WHERE id = ?`,
            [validData.photographerId],
          );
          if (!photographerExists) {
            sendInvalidInputError(
              res,
              `Photographer with ID '${validData.photographerId}' does not exist on [MASTER].`,
            );
            return;
          }
        }
      }

      if (table === "albums" && validData.photographerId) {
        const photographerExists = dbManager.get(
          `SELECT 1 FROM users WHERE id = ?`,
          [validData.photographerId],
        );
        if (!photographerExists) {
          sendInvalidInputError(
            res,
            `Photographer with ID '${validData.photographerId}' does not exist on [MASTER].`,
          );
          return;
        }
      }

      // Security: Hash password for users if present
      if (table === "users" && validData.password) {
        validData.password = await hashPassword(validData.password);
      }

      // Handle JSON serialization
      const jsonCols = JSON_COLUMNS[table] || [];
      const rowData: Record<string, any> = { ...validData };

      // Set timestamps
      const now = new Date().toISOString();
      if (!rowData.created_at && !rowData.created) {
        rowData.created_at = now;
      }
      rowData.updated_at = now;

      jsonCols.forEach((c) => {
        const val = rowData[c];
        if (val && typeof val === "object") {
          rowData[c] = JSON.stringify(val);
        }
      });

      // SQLite Compatibility: Sanitize booleans and undefined
      Object.keys(rowData).forEach((key) => {
        const val = rowData[key];
        if (typeof val === "boolean") {
          rowData[key] = val ? 1 : 0;
        } else if (val === undefined) {
          rowData[key] = null;
        }
      });

      // Security: Whitelist validation - Prevent SQL Injection
      const allowedCols = ALLOWED_COLUMNS[table];
      if (!allowedCols) {
        throw new Error(
          `Security: No allowed columns defined for table '${table}'`,
        );
      }

      Object.keys(rowData).forEach((key) => {
        if (!allowedCols.includes(key)) {
          delete rowData[key];
        }
      });

      // Use transaction for data consistency (Default Path)
      // Phase 34: Zero-Block IO Optimization for Updates
      let saved: any;

      if (
        isUpdate &&
        (table === "photos" || table === "albums") &&
        dbWriteQueue
      ) {
        // Optimistic Update & Deferred Write
        const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [
          validData.id,
        ]);
        if (!existing) {
          sendNotFoundError(res, `${table} record not found`);
          return;
        }

        // Enqueue write
        const updateData = { ...rowData };
        delete updateData.id; // Enqueue takes separate ID
        await dbWriteQueue.enqueue(table, validData.id, updateData);

        // Construct optimistic result for response (merge existing with updates)
        saved = { ...existing, ...rowData };
        logger.info(`[ZeroBlock] Deferred update for ${table}:${validData.id}`);
      } else {
        // Regular Synchronous Path
        logger.info(`[DEBUG] processRecordCreation: Inserting into ${table}`, {
          id: validData.id,
          albumId: validData.albumId,
          photographerId: validData.photographerId,
          keys: Object.keys(validData),
        });
        logger.debug(
          `[DEBUG] processRecordCreation: validData for ${table}`,
          validData,
        );

        saved = dbManager.transaction(() => {
          const existing = dbManager.get(
            `SELECT * FROM ${table} WHERE id = ?`,
            [validData.id],
          );

          if (existing) {
            // Update
            const keys = Object.keys(rowData).filter((k) => k !== "id");
            const updateKeys = keys.filter((k) => rowData[k] !== undefined);

            if (updateKeys.length > 0) {
              const setClause = updateKeys.map((k) => `${k} = ?`).join(", ");
              const values = updateKeys.map((k) => rowData[k]);
              values.push(validData.id);

              const updateResult = dbManager.run(
                `UPDATE ${table} SET ${setClause} WHERE id = ?`,
                values,
              );

              if (updateResult.changes === 0) {
                throw new Error(
                  "Update conflict: Record may have been modified or deleted by another operation",
                );
              }
            }
          } else {
            // Insert
            const keys = Object.keys(rowData);
            const cols = keys.join(", ");
            const placeholders = keys.map(() => "?").join(", ");
            const values = keys.map((k) => rowData[k]);

            const info = dbManager.run(
              `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
              values,
            );

            if (!validData.id && info.lastInsertRowid) {
              validData.id = Number(info.lastInsertRowid);
            }
          }

          const savedRecord = dbManager.get<Record<string, any>>(
            `SELECT * FROM ${table} WHERE id = ?`,
            [validData.id],
          );
          if (!savedRecord) {
            throw new Error(
              "Data integrity check failed: Record was not saved correctly",
            );
          }
          return savedRecord;
        });
      }

      // Remove password from response
      if (validData.password) delete validData.password;

      // Parse JSON columns in response
      const jsonColsResponse = JSON_COLUMNS[table] || [];
      const responseData = { ...validData };
      jsonColsResponse.forEach((c) => {
        if (saved[c] && typeof saved[c] === "string") {
          try {
            responseData[c] = JSON.parse(saved[c]);
          } catch (_e) {
            logger.warn(`Failed to parse JSON column ${c} in response:`, {
              error: _e instanceof Error ? _e.message : String(_e),
            });
          }
        }
      });

      // Rule: Auto-Cover Photo (Set first photo as album cover if missing)
      if (table === "photos" && !isUpdate) {
        try {
          const albumId = rowData.albumId;
          if (albumId) {
            const album = dbManager.get<{ coverPhotoUrl: string }>(
              "SELECT coverPhotoUrl FROM albums WHERE id = ?",
              [albumId],
            );
            // If album exists and has no cover, set it to the new photo's thumbnail or main URL
            if (album && !album.coverPhotoUrl) {
              const photoUrl =
                rowData.thumbnailUrl || rowData.previewUrl || rowData.url;
              if (photoUrl) {
                dbManager.run(
                  "UPDATE albums SET coverPhotoUrl = ?, updated_at = ? WHERE id = ?",
                  [photoUrl, now, albumId],
                );
                logger.info(
                  `[AutoCover] Automatically set cover photo for album ${albumId}: ${photoUrl}`,
                );

                // Notify Realtime Clients of Album update
                if (context.realtimeService) {
                  const updatedAlbum = dbManager.get(
                    "SELECT * FROM albums WHERE id = ?",
                    [albumId],
                  );
                  if (updatedAlbum) {
                    context.realtimeService.broadcast({
                      collection: "albums",
                      action: "update",
                      record: updatedAlbum,
                    });
                  }
                }
              }
            }
          }
        } catch (_e) {
          logger.warn("[AutoCover] Failed to update album cover:", {
            error: _e instanceof Error ? _e.message : String(_e),
          });
        }
      }

      // Audit Log Data Access (P1)
      const auditUser = (req as any).session?.user || (req as any).user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        isUpdate ? "UPDATE" : "CREATE",
        table,
        validData.id,
      );

      logger.info("Save operation completed", {
        table,
        operation: isUpdate ? "UPDATE" : "INSERT",
        recordId: validData.id,
        duration: `${Date.now() - saveStartTime}ms`,
        endpoint: pathName,
      });

      // Notify Realtime Clients
      if (context.realtimeService) {
        context.realtimeService.broadcast({
          collection: reqWithTable.collection, // Use original collection name (e.g. 'photographers')
          action: isUpdate ? "update" : "create",
          record: responseData,
        });
      }

      // Rule: Trigger Order Validation (Split Logic) - API Path
      if (table === "orders" && context.orderValidationService) {
        const status = (responseData.status || "").toLowerCase();
        if (status === "paid" || status === "verified") {
          // We need albumId and items
          let albumId = responseData.albumId;
          let items = responseData.items;

          // If missing (partial update), fetch from DB
          if (!albumId || !items) {
            try {
              const fullOrder = dbManager.get(
                "SELECT albumId, items FROM orders WHERE id = ?",
                [validData.id],
              );
              if (fullOrder) {
                if (!albumId) albumId = fullOrder.albumId;
                if (!items && fullOrder.items) {
                  try {
                    items = JSON.parse(fullOrder.items);
                  } catch (_e) {
                    logger.warn(
                      `Failed to parse order items JSON for order ${validData.id}:`,
                      { error: _e instanceof Error ? _e.message : String(_e) },
                    );
                  }
                }
              }
            } catch (_e) {
              /* ignore fetch error */
            }
          }

          if (albumId && items) {
            const assetIds = (Array.isArray(items) ? items : []).map(
              (i: any) => (typeof i === "string" ? i : i.photoId || i.id),
            );
            try {
              context.orderValidationService.validateOrder(
                validData.id,
                albumId,
                assetIds,
              );
            } catch (_e: any) {
              logger.error(
                `[CollectionRoutes] Validation Trigger Failed ${validData.id}: ${_e.message}`,
              );
            }
          }
        }
      }

      // Rule: Offline Order Fulfillment (Hot Folders)
      // Create a physical folder with high-res assets for every new order
      if (table === "orders" && !isUpdate) {
        try {
          // Use DATA_DIR from constants if possible, or fall back to finding it relative to IMPORT_DIR
          // IMPORT_DIR = DATA_DIR/uploads, so DATA_DIR = dirname(IMPORT_DIR)
          const dataDir = path.dirname(IMPORT_DIR);
          const orderNumber = responseData.orderNumber || responseData.id;
          const orderDir = path.join(dataDir, "orders", `order-${orderNumber}`);

          if (!fs.existsSync(orderDir))
            fs.mkdirSync(orderDir, { recursive: true });

          const items = Array.isArray(responseData.items)
            ? responseData.items
            : [];

          // Async copy to not block I/O Thread (Rule 13)
          // Loop through items
          for (const item of items) {
            const photoId = item.photoId || (item.photo && item.photo.id);

            if (photoId) {
              // Fetch fresh photo data to get storage path/url
              const photo = dbManager.get<{
                url: string;
                originalFilename: string;
              }>("SELECT url, originalFilename FROM photos WHERE id = ?", [
                photoId,
              ]);

              if (photo && photo.url) {
                const srcPath = path.join(IMPORT_DIR, photo.url);

                try {
                  // Check existence asynchronously
                  await fs.promises.access(srcPath);

                  // Sanitize filename
                  const safeFilename = (
                    photo.originalFilename || path.basename(photo.url)
                  ).replace(/[^a-z0-9.]/gi, "_");
                  const destPath = path.join(orderDir, safeFilename);

                  // Non-blocking copy
                  await fs.promises.copyFile(srcPath, destPath);
                } catch (_e) {
                  logger.warn(
                    `[OrderFulfillment] Source photo not found or copy failed: ${srcPath}`,
                  );
                }
              }
            }
          }
          logger.info(`[OrderFulfillment] Created hot folder: ${orderDir}`);

          // Create a simple manifest (Async)
          await fs.promises.writeFile(
            path.join(orderDir, "order_info.json"),
            JSON.stringify(responseData, null, 2),
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.error("[OrderFulfillment] Failed to process hot folder", {
            error: error.message,
          });
          // Don't fail the request, just log it
        }
      }

      if (!res.headersSent) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(responseData));
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`CRUD Error for ${pathName}`, {
        error: error.message,
        stack: error.stack,
        endpoint: pathName,
        operation: req.method,
        table,
      });
      auditLogger.logError(error, {
        endpoint: pathName,
        operation: req.method,
        table,
      });

      if (!res.headersSent) {
        if (
          error.message.includes("UNIQUE constraint") ||
          error.message.includes("already exists")
        ) {
          sendError(
            res,
            409,
            "Conflict",
            `A record with this identifier already exists.`,
            ERROR_CODES.CONFLICT,
          );
        } else if (
          error.message.includes("FOREIGN KEY constraint") ||
          error.message.includes("does not exist")
        ) {
          sendInvalidInputError(res, error.message || "Invalid reference.");
        } else if (error.message.includes("conflict")) {
          sendError(res, 409, "Conflict", error.message, ERROR_CODES.CONFLICT);
        } else {
          sendDatabaseError(res, error, `${req.method} operation on ${table}`);
        }
      }
    }
  };

  // --- Middleware to validate table name (Security Whitelist) ---
  router.all(
    "/:collection/records",
    (req: Request, res: Response, next: NextFunction) => {
      const collection = req.params.collection;
      const table = TABLE_MAP[collection as keyof typeof TABLE_MAP];

      if (!table || !ALLOWED_COLUMNS[table]) {
        logger.warn(`[Security] Unauthorized collection access attempt: ${collection}`, {
          ip: req.ip,
          method: req.method
        });
        return sendNotFoundError(res, `Collection '${collection}'`);
      }

      try {
        (req as CollectionRequest).table = table;
        (req as CollectionRequest).collection = collection as string;

        // --- SECURITY HARDENING: Role-Based Access Control ---
        const user = (req as any).session?.user || (req as any).user;
        const isAdmin = user?.role === "Admin" || user?.role === "CEO" || user?.role === "Manager";

        // 1. Sensitive Table Protection
        const ADMIN_ONLY_TABLES = ["settings", "revenue", "audit_logs", "payroll_ledger", "role_permissions"];
        const AUTH_REQUIRED_TABLES = ["users", "kiosks", "destinations", "expenses", "daily_objectives", "pairing_requests"];

        if (ADMIN_ONLY_TABLES.includes(table) && !isAdmin) {
          return sendError(res, 403, "Forbidden", "Insufficient permissions for administrative data.", ERROR_CODES.AUTHORIZATION_ERROR);
        }

        if (AUTH_REQUIRED_TABLES.includes(table) && !user) {
          return sendError(res, 401, "Unauthorized", "Authentication required for this collection.", ERROR_CODES.AUTHENTICATION_ERROR);
        }

        // 2. Guest/Kiosk Restrictions (Rule 02/08 Compliance)
        if (!user) {
          // Kiosks and Guests are strictly READ-ONLY on business operational data
          if (req.method !== "GET" && ["albums", "photos", "orders", "session_types"].includes(table)) {
            // NOTE: Orders are pushed from Touch-App via orderExport.ts, NOT generic CRUD.
            // Generic CRUD POST /orders/records is blocked for guests to prevent spoofing.
            return sendError(res, 403, "Forbidden", "Write access restricted to authenticated staff.", ERROR_CODES.AUTHORIZATION_ERROR);
          }
        }

        next();
      } catch (err: any) {
        logger.error(`[Collections] Middleware error: ${err.message}`, { table, collection });
        sendNotFoundError(res, `Collection '${collection}'`);
      }
    },
  );

  /**
   * @route GET /:collection/records
   * @description List records
   */
  router.get("/:collection/records", (req: Request, res: Response) => {
    const { table } = req as CollectionRequest;
    const pathName = req.originalUrl;

    try {
      const filterParam =
        typeof req.query.filter === "string" ? req.query.filter : undefined;
      const sortParam =
        typeof req.query.sort === "string" ? req.query.sort : undefined;
      const expandParam =
        typeof req.query.expand === "string" ? req.query.expand : undefined;
      const pageParam =
        typeof req.query.page === "string" ? req.query.page : undefined;
      const perPageParam =
        typeof req.query.perPage === "string" ? req.query.perPage : undefined;

      const updatedAfterParam =
        typeof req.query.updatedAfter === "string"
          ? req.query.updatedAfter
          : typeof req.query.since === "string"
            ? req.query.since
            : undefined;

      const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
      const perPage = perPageParam
        ? Math.min(500, Math.max(1, parseInt(perPageParam, 10)))
        : 30; // 30 is good default if null

      let sql = `SELECT * FROM ${table}`;
      const params: any[] = [];
      let countSql = `SELECT COUNT(*) as total FROM ${table}`;
      const countParams: any[] = [];
      const whereClauses: string[] = [];

      // 0. Delta Sync (Rule 15: Optimization)
      if (updatedAfterParam) {
        // Ensure table has updated_at or similar
        // We assume most valid tables have it. If not, this might fail or return empty?
        // Better to check or try/catch?
        // SQLite ignores extra WHERE if column doesn't exist? No it errors.
        // We can check disallowed columns but ALLOWED_COLUMNS usually includes updated_at.
        whereClauses.push(`updated_at > ?`);
        params.push(updatedAfterParam);
        countParams.push(updatedAfterParam);
      }

      // 1. Filtering
      if (filterParam) {
        // Simplified regex
        let match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*"([^"]+)"/); // Double quotes
        if (!match)
          match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*'([^']+)'/); // Single quotes
        if (!match)
          match = filterParam.match(/([a-zA-Z0-9_]+)\s*=\s*([^"'\s]+)/); // No quotes

        if (match) {
          let key = match[1];
          const val = match[2];
          key = (COLUMN_MAP[table] && COLUMN_MAP[table][key]) || key;

          if (
            !ALLOWED_COLUMNS[table] ||
            !ALLOWED_COLUMNS[table].includes(key)
          ) {
            sendInvalidInputError(res, `Invalid filter column '${key}'`);
            return;
          }

          whereClauses.push(`${key} = ?`);
          params.push(val);
          countParams.push(val);
        }
      }

      if (whereClauses.length > 0) {
        const whereStr = ` WHERE ${whereClauses.join(" AND ")}`;
        sql += whereStr;
        countSql += whereStr;
      }

      // 2. Sorting
      if (sortParam) {
        const desc = sortParam.startsWith("-");
        let key = sortParam.replace(/^[+-]/, "");
        key = (COLUMN_MAP[table] && COLUMN_MAP[table][key]) || key;

        if (ALLOWED_COLUMNS[table] && ALLOWED_COLUMNS[table].includes(key)) {
          sql += ` ORDER BY ${key} ${desc ? "DESC" : "ASC"}`;
        } else {
          sendInvalidInputError(res, `Invalid sort column '${key}'`);
          return;
        }
      }

      // 3. Pagination
      // Check if perPage param was actually present or we just used default
      const isPaged = perPageParam !== undefined;

      let totalItems = 0;
      if (isPaged) {
        const countResult = dbManager.query<{ total: number }>(
          countSql,
          countParams,
        );
        totalItems = countResult[0]?.total || 0;
        const offset = (page - 1) * perPage;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(perPage, offset);
      }

      let rows = dbManager.query<Record<string, any>>(sql, params);

      // 4. Expansion (Optimized: Batch fetch instead of N+1)
      if (
        expandParam &&
        expandParam.includes("photos_via_album") &&
        table === "albums" &&
        rows.length > 0
      ) {
        const albumIds = rows.map((a) => a.id);
        const placeholders = albumIds.map(() => "?").join(",");
        const allPhotos = dbManager.query<{ albumId: string }>(
          `SELECT * FROM photos WHERE albumId IN (${placeholders})`,
          albumIds,
        );

        // Group photos by albumId
        const photosByAlbum: Record<string, any[]> = {};
        allPhotos.forEach((p) => {
          if (!photosByAlbum[p.albumId]) photosByAlbum[p.albumId] = [];
          photosByAlbum[p.albumId].push(p);
        });

        rows = rows.map((album) => ({
          ...album,
          expand: { photos_via_album: photosByAlbum[album.id] || [] },
        }));
      }

      const parsedRows = rows.map((row) => {
        try {
          const jsonCols = JSON_COLUMNS[table] || [];
          const parsedRow = { ...row };

          // Security: Always strip password from output
          if ("password" in parsedRow) {
            delete parsedRow.password;
          }

          jsonCols.forEach((c) => {
            if (parsedRow[c] && typeof parsedRow[c] === "string") {
              try {
                parsedRow[c] = JSON.parse(parsedRow[c]);
              } catch (_e) {
                logger.warn(`Failed to parse JSON column ${c} in row:`, {
                  error: _e instanceof Error ? _e.message : String(_e),
                });
              }
            }
          });
          return parsedRow;
        } catch (_e) {
          return row;
        }
      });

      const cacheHeaders = {
        "Content-Type": "application/json",
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
      };

      // Audit Log Data Access (P1)
      const auditUser = (req as any).session?.user || (req as any).user;
      auditLogger.logDataAccess(
        auditUser?.id || "unknown",
        auditUser?.email || "unknown",
        "READ",
        table,
        null, // Bulk read
      );

      res.writeHead(200, cacheHeaders);
      if (table === "users") {
        logger.info(
          `[Debug] User records fetch for role: ${(req as any).session?.user?.role || "Guest"}`,
          { counts: parsedRows.length },
        );
        if (parsedRows.length > 0) {
          logger.debug(`[Debug] First record:`, parsedRows[0]);
        }
      }

      if (isPaged) {
        const responseData = {
          items: parsedRows,
          page,
          perPage,
          totalItems,
          totalPages: Math.ceil(totalItems / perPage),
        };
        if (table === "users")
          logger.info("[Debug] Paged response structured", {
            item0: responseData.items[0]?.name,
          });
        res.end(JSON.stringify(responseData));
      } else {
        const responseData = { items: parsedRows };
        if (table === "users")
          logger.info("[Debug] Unpaged response structured", {
            item0: responseData.items[0]?.name,
          });
        res.end(JSON.stringify(responseData));
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`GET Error`, { error: error.message, endpoint: pathName });
      sendDatabaseError(res, error, `fetching records from ${table}`);
    }
  });

  /**
   * @route POST /:collection/records
   * @description Create record (supports Multipart/Form-Data)
   */
  router.post("/:collection/records", (req: Request, res: Response) => {
    const { table, collection } = req as CollectionRequest;
    console.log(
      `[Collections] Received POST request for ${collection} (table: ${table})`,
    );
    const pathName = req.originalUrl;
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      const form = formidable({
        multiples: true,
        uploadDir: IMPORT_DIR,
        keepExtensions: true,
        maxFileSize: 500 * 1024 * 1024,
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          logger.error(`[Collections] File upload failed: ${err.message}`, {
            error: err,
          });
          sendFileError(res, `File upload failed: ${err.message}`);
          return;
        }

        // Debug logging for photo uploads
        if (table === "photos") {
          logger.info(`[Collections] Photo upload fields:`, {
            fields: Object.keys(fields).reduce(
              (acc, k) => ({ ...acc, [k]: fields[k] }),
              {},
            ),
            files: Object.keys(files),
            hasPhotoProcessor: !!photoProcessor,
          });
        }

        // Flatten fields
        const data: Record<string, any> = {};
        Object.keys(fields).forEach((key) => {
          const val = fields[key];
          // formidable v3 returns array by default.
          const fieldValue =
            Array.isArray(val) && val.length === 1 ? val[0] : val;
          if (table === "photos" && key === "photographerId" && fieldValue) {
            data[key] = parseInt(String(fieldValue), 10) || 0;
          } else if (table === "photos" && key === "albumId") {
            data[key] = String(fieldValue || "");
          } else {
            data[key] = fieldValue;
          }
        });

        // Process files
        const fileProcessingPromises: Promise<void>[] = [];
        // formidable v3 'files' is object of arrays
        const filesObj = files || {};

        Object.keys(filesObj).forEach((key) => {
          const fileArr = filesObj[key];
          const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
          if (file) {
            if (table === "photos" && key === "url" && photoProcessor) {
              const albumId = data.albumId;
              const photoId = data.id || crypto.randomUUID();
              if (!data.id) data.id = photoId;

              // RACE CONDITION DEFENSE: Check Album Existence BEFORE Heavy Processing
              // This prevents "Album not found" errors after processing and ensures DB consistency
              fileProcessingPromises.push(
                (async () => {
                  if (albumId) {
                    let albumExists = null;
                    logger.info(
                      `[RaceDefense] Checking Album existence: ID='${albumId}' (Type: ${typeof albumId})`,
                    );
                    for (let i = 0; i < 25; i++) {
                      albumExists = dbManager.get(
                        `SELECT 1 FROM albums WHERE id = ?`,
                        [albumId],
                      );
                      if (albumExists) {
                        if (i > 0)
                          logger.warn(
                            `[RaceDefense] Album ${albumId} found after ${i} retries.`,
                          );
                        else
                          logger.info(
                            `[RaceDefense] Album ${albumId} found immediately.`,
                          );
                        break;
                      }
                      await new Promise((resolve) => setTimeout(resolve, 200));
                    }
                    if (!albumExists) {
                      const allAlbums = dbManager.query(
                        "SELECT id FROM albums LIMIT 5",
                      );
                      logger.error(
                        `[RaceDefense] Album ${albumId} NOT FOUND after 5s retry loop.`,
                        {
                          checkedId: albumId,
                          type: typeof albumId,
                          length: String(albumId).length,
                          recentAlbumIds: allAlbums.map((a) => a.id),
                        },
                      );
                      throw new Error(
                        `Album ${albumId} not found after 5s pre-check on [MASTER]`,
                      );
                    }
                  }

                  logger.info(
                    `[PhotoProcessor] Starting processing for photo ${photoId} (Album: ${albumId})`,
                  );
                  return photoProcessor.processPhoto(
                    file as any,
                    albumId,
                    photoId,
                  );
                })().then((photoData) => {
                  data.url = photoData.url;
                  data.originalFilename = photoData.originalFilename;
                  data.fileSize = photoData.fileSize;
                  data.mimeType = photoData.mimeType;
                  data.width = photoData.width;
                  data.height = photoData.height;
                  data.fileHash = photoData.fileHash;
                  data.quality_flags = JSON.stringify(
                    photoData.qualityFlags || [],
                  );
                  if (!data.title) {
                    data.title = path.parse(
                      photoData.originalFilename || "",
                    ).name;
                  }
                }),
              );
            } else {
              // Basic handling
              data[key] = file.newFilename;
            }
          }
        });

        if (fileProcessingPromises.length === 0) {
          processRecordCreation(req, res, table, data, pathName);
          return;
        }

        Promise.all(fileProcessingPromises)
          .then(() => {
            processRecordCreation(req, res, table, data, pathName).catch(
              (error) => {
                sendDatabaseError(res, error, "inserting record");
              },
            );
          })
          .catch((err) => {
            logger.error(`[Collections] File processing failed`, {
              error: err.message,
              stack: err.stack,
              albumId: data.albumId,
              table,
            });
            sendFileError(res, `File processing failed: ${err.message}`);
          });
      });
      return;
    }

    // JSON handling
    const data = req.body || {};
    processRecordCreation(req, res, table, data, pathName);
  });

  /**
   * @route PATCH /:collection/records/:id
   * @description Update record
   */
  router.patch("/:collection/records/:id", (req: Request, res: Response) => {
    const { table } = req as CollectionRequest;
    const pathName = req.originalUrl;
    const id = req.params.id;
    const data = req.body || {};

    if (!data.id) data.id = id;
    processRecordCreation(req, res, table, data, pathName);
  });

  /**
   * @route DELETE /:collection/records/:id
   * @description Delete record
   */
  router.delete("/:collection/records/:id", (req: Request, res: Response) => {
    const { table, collection } = req as CollectionRequest;
    const id = req.params.id;
    const pathName = req.originalUrl;

    try {
      const result = dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

      if (result.changes === 0) {
        logger.warn(`DELETE Failed: Record not found`, {
          table,
          id,
          endpoint: pathName,
        });
        sendNotFoundError(res, `Record with ID '${id}'`);
        return;
      }

      // Notify Realtime Clients
      if (context.realtimeService) {
        context.realtimeService.broadcast({
          collection: collection,
          action: "delete",
          record: { id, collectionName: collection },
        });
      }

      logger.info(`DELETE Success`, { table, id, endpoint: pathName });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`DELETE Error`, {
        error: error.message,
        endpoint: pathName,
      });
      sendDatabaseError(res, error, `deleting record from ${table}`);
    }
  });

  return router;
}
