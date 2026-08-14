import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import formidable, { File, Fields } from "formidable";
import { DatabaseManager } from "../shared/db";
import { validateRequest } from "../shared/validation";
import { hashPassword } from "../shared/auth";
import { validatePassword } from "../shared/passwordValidator";
import {
  sendError,
  sendValidationError,
  sendInvalidInputError,
  sendDatabaseError,
  sendNotFoundError,
  sendFileError,
  ERROR_CODES,
} from "../shared/errorHandler";
import { Logger } from "../shared/logger";
import AuditLogger from "../shared/auditLogger";

/** Minimal broadcast interface — avoids circular dep with RealtimeService */
interface BroadcastService {
  broadcast(payload: {
    collection: string;
    action: string;
    record: Record<string, unknown>;
  }): void;
}

interface CollectionsContext {
  dbManager: DatabaseManager;
  logger: Logger;
  auditLogger: AuditLogger;
  UPLOAD_DIR: string;
  IMPORT_DIR: string;
  realtimeService?: BroadcastService;
}

const TABLE_MAP: Record<string, string> = {
  users: "users",
  albums: "albums",
  photos: "photos",
  orders: "orders",
  products: "products",
  kiosks: "kiosks",
  settings: "settings",
};

const ALLOWED_COLUMNS: Record<string, string[]> = {
  albums: [
    "id",
    "created_at",
    "updated_at",
    "name",
    "date",
    "photographerId",
    "status",
    "coverPhotoId",
    "kiosk_ready",
    "roomNumber",
  ],
  photos: [
    "id",
    "created_at",
    "updated_at",
    "albumId",
    "url",
    "title",
    "photographerId",
    "fileSize",
    "dimensions",
  ],
  users: [
    "id",
    "created_at",
    "updated_at",
    "email",
    "name",
    "role",
    "active",
    "password_must_change",
  ],
  orders: [
    "id",
    "created_at",
    "updated_at",
    "date",
    "items",
    "total",
    "status",
    "email",
    "phone",
    "clientName",
    "photographerId",
    "destinationId",
    "paymentMethod",
    "appliedDiscount",
    "source",
    "albumId",
    "roomNumber",
    "customerEmail",
    "paymentIntentId",
    "kioskId",
    "checksum",
  ],
  kiosks: [
    "id",
    "created_at",
    "updated_at",
    "name",
    "ip",
    "status",
    "lastSeen",
  ],
  settings: ["id", "created_at", "updated_at", "key", "value", "description"],
};

const COLUMN_MAP: Record<string, string> = {
  created: "created_at",
  updated: "updated_at",
};

const JSON_COLUMNS: Record<string, string[]> = {
  orders: ["items"],
  settings: ["value"],
};

export default function createCollectionsRouter(
  context: CollectionsContext,
): Router {
  const router = Router();
  const {
    dbManager,
    logger,
    auditLogger,
    UPLOAD_DIR,
    IMPORT_DIR,
    realtimeService,
  } = context;

  const processRecordCreation = async (
    req: Request,
    res: Response,
    table: string,
    data: any,
  ) => {
    const saveStartTime = Date.now();

    try {
      const remoteAddress = req.socket.remoteAddress || "unknown";
      const isLocalhost =
        remoteAddress === "::1" || remoteAddress === "127.0.0.1";

      if (
        (table === "albums" || table === "photos") &&
        (req.method === "PATCH" || req.method === "DELETE")
      ) {
        const isRecoveredAlbumCleanup =
          table === "albums" && req.method === "DELETE" && data.id;

        if (isLocalhost) {
          logger.debug("Allowing local write operation", {
            table,
            method: req.method,
            id: data.id,
          });
        } else if (isRecoveredAlbumCleanup) {
          const album = dbManager.get<{ title: string }>(
            "SELECT title FROM albums WHERE id = ?",
            [data.id],
          );
          if (album && album.title && album.title.includes("Recovered")) {
            logger.info("Allowing cleanup of Recovered Album", {
              albumId: data.id,
              title: album.title,
            });
          } else {
            logger.warn("Attempted write operation on read-only collection", {
              method: req.method,
              table,
              clientIp: remoteAddress,
            });
            auditLogger.logUnauthorizedAccess(
              req.originalUrl,
              remoteAddress,
              "READ_ONLY_VIOLATION",
            );
            return sendError(
              res,
              403,
              "Forbidden",
              "Touch backend is read-only. Albums and photos cannot be modified from this endpoint. Use the Master backend for write operations.",
              ERROR_CODES.AUTHORIZATION_ERROR,
            );
          }
        } else {
          logger.warn("Attempted write operation on read-only collection", {
            method: req.method,
            table,
            clientIp: remoteAddress,
          });
          auditLogger.logUnauthorizedAccess(
            req.originalUrl,
            remoteAddress,
            "READ_ONLY_VIOLATION",
          );
          return sendError(
            res,
            403,
            "Forbidden",
            "Touch backend is read-only. Albums and photos cannot be modified from this endpoint. Use the Master backend for write operations.",
            ERROR_CODES.AUTHORIZATION_ERROR,
          );
        }
      }

      if (table === "users" || table === "destinations") {
        logger.info(`Processing ${table} update/create`, {
          method: req.method,
          hasId: !!data.id,
          id: data.id,
          dataKeys: Object.keys(data),
          data:
            table === "users"
              ? { ...data, password: data.password ? "[HIDDEN]" : undefined }
              : data,
        });
      }

      const isUpdate =
        req.method === "PATCH" ||
        (data.id &&
          dbManager.get(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [
            data.id,
          ]));
      const validation = validateRequest(data, table, isUpdate);
      if (!validation.success) {
        logger.error("Validation failed", {
          table,
          error: validation.error,
          details: validation.details,
          data:
            table === "users"
              ? { ...data, password: data.password ? "[HIDDEN]" : undefined }
              : data,
        });
        return sendValidationError(
          res,
          `Validation failed for ${table} record: ${validation.error}`,
          validation.details,
        );
      }

      const validData = validation.data!;
      if (!validData.id && table !== "users")
        validData.id = crypto.randomUUID();

      if (table === "photos") {
        logger.info("Validated photo data before insert", {
          id: validData.id,
          albumId: validData.albumId,
          photographerId: validData.photographerId,
          title: validData.title,
          url: validData.url ? "[FILE]" : undefined,
        });
      }

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
              `[RaceDefense] Album ${albumIdCheck} NOT FOUND after 5s (JSON/Central Path).`,
            );
            sendInvalidInputError(
              res,
              `Album with ID '${albumIdCheck}' does not exist on [TOUCH] (after 5s retries).`,
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
            return sendInvalidInputError(
              res,
              `Photographer with ID '${validData.photographerId}' does not exist on [TOUCH].`,
            );
          }
        }
      }

      if (table === "albums" && validData.photographerId) {
        const photographerExists = dbManager.get(
          `SELECT 1 FROM users WHERE id = ?`,
          [validData.photographerId],
        );
        if (!photographerExists) {
          return sendInvalidInputError(
            res,
            `Photographer with ID '${validData.photographerId}' does not exist on [TOUCH].`,
          );
        }
      }

      if (table === "users" && validData.password) {
        const passwordValidation = validatePassword(validData.password);

        if (!passwordValidation.valid) {
          logger.warn("Password validation failed", {
            errors: passwordValidation.errors,
          });
          return sendValidationError(
            res,
            "Password does not meet security requirements",
            {
              password: passwordValidation.errors,
            },
          );
        }

        if (logger && logger.info) {
          logger.info("Password validation passed", {
            strength: passwordValidation.strength,
          });
        }

        validData.password = await hashPassword(validData.password);
        validData.password_must_change = 0;
      }

      // Law 08: Intercept order creation to add integrity checksum
      if (table === 'orders' && (req.method === 'POST' || !isUpdate)) {
        const { OrderIntegrity } = require('../shared/OrderIntegrity');
        validData.checksum = OrderIntegrity.calculateChecksum(validData);
        logger.info(`[Sync] Calculated integrity checksum for Order ${validData.id}: ${validData.checksum}`);
      }

      const jsonCols = JSON_COLUMNS[table] || [];
      const rowData: any = { ...validData };
      jsonCols.forEach((c) => {
        if (rowData[c] && typeof rowData[c] === "object") {
          rowData[c] = JSON.stringify(rowData[c]);
        }
      });

      const saved = dbManager.transaction(() => {
        const existing = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [
          validData.id,
        ]);

        // SECURITY: Validate column names against whitelist
        const allowedCols = ALLOWED_COLUMNS[table] || [];
        if (existing) {
          const keys = Object.keys(rowData).filter((k) => k !== "id");
          const updateData: any = { id: rowData.id };
          
          const invalidCols = keys.filter((k) => !allowedCols.includes(k));
          if (invalidCols.length > 0) {
            throw new Error(`Invalid column names: ${invalidCols.join(", ")}`);
          }
          
          keys.forEach((k) => {
            if (rowData[k] !== undefined) {
              updateData[k] = rowData[k];
            }
          });

          const updateKeys = Object.keys(updateData).filter((k) => k !== "id");

          if (updateKeys.length > 0) {
            const setClause = updateKeys.map((k) => `${k} = @${k}`).join(", ");
            const updateResult = dbManager.run(
              `UPDATE ${table} SET ${setClause} WHERE id = @id`,
              updateData,
            );
            if (updateResult.changes === 0) {
              throw new Error(
                "Update conflict: Record may have been modified or deleted by another operation",
              );
            }
          }
        } else {
          const keys = Object.keys(rowData);
          
          // SECURITY: Validate all column names for INSERT
          const invalidCols = keys.filter((k) => !allowedCols.includes(k));
          if (invalidCols.length > 0) {
            throw new Error(`Invalid column names: ${invalidCols.join(", ")}`);
          }
          
          const cols = keys.join(", ");
          const vals = keys.map((k) => `@${k}`).join(", ");
          const info = dbManager.run(
            `INSERT INTO ${table} (${cols}) VALUES (${vals})`,
            rowData,
          );
          if (!validData.id && info.lastInsertRowid) {
            validData.id = Number(info.lastInsertRowid);
          }
        }

        const savedRecord = dbManager.get(
          `SELECT * FROM ${table} WHERE id = ?`,
          [validData.id],
        );
        if (!savedRecord)
          throw new Error(
            "Data integrity check failed: Record was not saved correctly",
          );

        if (table === "photos" && (savedRecord as any).albumId) {
          const albumStillExists = dbManager.get(
            `SELECT 1 FROM albums WHERE id = ?`,
            [(savedRecord as any).albumId],
          );
          if (!albumStillExists)
            throw new Error(
              "Data integrity check failed: Referenced album no longer exists",
            );
        }
        return savedRecord;
      });

      if (table === "photos") {
        logger.info("Photo inserted, verifying", {
          photoId: validData.id,
          albumId: (saved as any)?.albumId,
          found: !!saved,
        });
      }

      if (validData.password) delete validData.password;

      const jsonColsResponse = JSON_COLUMNS[table] || [];
      const responseData: any = { ...validData };

      jsonColsResponse.forEach((c) => {
        if ((saved as any)[c] && typeof (saved as any)[c] === "string") {
          try {
            responseData[c] = JSON.parse((saved as any)[c]);
          } catch (e) {}
        }
      });

      responseData.collectionId = table;
      responseData.collectionName = table;

      logger.info("Save operation completed", {
        table,
        operation: isUpdate ? "UPDATE" : "INSERT",
        recordId: validData.id,
        duration: `${Date.now() - saveStartTime}ms`,
      });

      if (realtimeService) {
        realtimeService.broadcast({
          collection: table,
          action: isUpdate ? "update" : "create",
          record: responseData,
        });
      }

      // Rule 21: Hot Folder Order Creation
      if (table === "orders" && !isUpdate) {
        try {
          const settings = dbManager.get<{ value: string }>(
            "SELECT value FROM settings WHERE key = 'touchOrdersFolder'",
          );
          let targetFolder = path.join(process.cwd(), "pb_data", "orders");

          if (settings && settings.value) {
            try {
              // Try parsing as JSON first (handles {"path": "..."})
              const parsed = JSON.parse(settings.value);
              if (parsed && typeof parsed === "object" && parsed.path) {
                targetFolder = parsed.path;
              } else if (typeof parsed === "string") {
                targetFolder = parsed;
              } else {
                targetFolder = String(settings.value);
              }
            } catch (e) {
              // Fallback to raw string if JSON parsing fails
              targetFolder = String(settings.value);
            }
          }

          if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
          }

          const orderFolderName = `order-${responseData.id}`;
          const orderPath = path.join(targetFolder, orderFolderName);
          if (!fs.existsSync(orderPath))
            fs.mkdirSync(orderPath, { recursive: true });

          const photosPath = path.join(orderPath, "photos");
          if (!fs.existsSync(photosPath))
            fs.mkdirSync(photosPath, { recursive: true });

          // Copy photos into the bundle
          if (responseData.items && Array.isArray(responseData.items)) {
            const photoImportSettings = dbManager.get<{ value: string }>(
              "SELECT value FROM settings WHERE key = 'photoImportFolder'",
            );
            let importDir = "";
            if (photoImportSettings && photoImportSettings.value) {
              try {
                const parsed = JSON.parse(photoImportSettings.value);
                if (parsed && typeof parsed === "object" && parsed.path) {
                  importDir = parsed.path;
                } else if (typeof parsed === "string") {
                  importDir = parsed;
                } else {
                  importDir = String(photoImportSettings.value);
                }
              } catch (e) {
                importDir = String(photoImportSettings.value);
              }
            }

            // Fallback to default uploads directory if not configured
            if (!importDir) {
              importDir = path.join(process.cwd(), "pb_data", "uploads");
            }

            if (importDir && fs.existsSync(importDir)) {
              responseData.items.forEach((item: any) => {
                let photoUrl = item.photo?.url || item.url;
                if (photoUrl) {
                  // Handle absolute URLs by extracting the filename
                  if (photoUrl.startsWith("http")) {
                    try {
                      photoUrl = path.basename(new URL(photoUrl).pathname);
                    } catch (e) {
                      photoUrl = path.basename(photoUrl);
                    }
                  }
                  try {
                    // Look for the photo recursively or in common subfolders if needed,
                    // but usually they are top-level in the monitored folder or in date subfolders
                    let sourcePath = path.join(importDir, photoUrl);
                    const destPath = path.join(
                      photosPath,
                      path.basename(photoUrl),
                    );

                    if (!fs.existsSync(sourcePath)) {
                      const findFileRecursive = (
                        dir: string,
                        targetName: string,
                      ): string | null => {
                        try {
                          const items = fs.readdirSync(dir, {
                            withFileTypes: true,
                          });
                          for (const item of items) {
                            const fullPath = path.join(dir, item.name);
                            if (item.isDirectory()) {
                              const found = findFileRecursive(
                                fullPath,
                                targetName,
                              );
                              if (found) return found;
                            } else if (item.name === targetName) {
                              return fullPath;
                            }
                          }
                        } catch (e) {}
                        return null;
                      };
                      const foundPath = findFileRecursive(
                        importDir,
                        path.basename(photoUrl),
                      );
                      if (foundPath) sourcePath = foundPath;
                    }

                    if (fs.existsSync(sourcePath)) {
                      fs.copyFileSync(sourcePath, destPath);
                      logger.info(
                        `[HotFolder] Copied photo: ${path.basename(sourcePath)} to order bundle`,
                      );
                    } else {
                      logger.warn(
                        `[HotFolder] Photo not found in ${importDir}: ${photoUrl}`,
                      );
                    }
                  } catch (err: any) {
                    logger.error(
                      `[HotFolder] Failed to copy photo ${photoUrl}`,
                      { error: err.message },
                    );
                  }
                }
              });
            }
          }

          const metadataPath = path.join(orderPath, "metadata.json");
          fs.writeFileSync(metadataPath, JSON.stringify(responseData, null, 2));
          logger.info(`[HotFolder] Created order bundle: ${orderPath}`);
        } catch (err: any) {
          logger.error("[HotFolder] Failed to create order file", {
            error: err.message,
          });
        }
      }

      res.status(200).json(responseData);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`CRUD Error for ${req.originalUrl}`, {
        error: error.message,
        stack: error.stack,
        operation: req.method,
        table,
      });
      auditLogger.logError(error, {
        endpoint: req.originalUrl,
        operation: req.method,
        table,
      });

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
        sendInvalidInputError(
          res,
          error.message ||
            "Invalid reference. The referenced record does not exist.",
        );
      } else if (
        error.message.includes("conflict") ||
        error.message.includes("modified or deleted")
      ) {
        sendError(res, 409, "Conflict", error.message, ERROR_CODES.CONFLICT);
      } else if (error.message.includes("Data integrity check failed")) {
        sendDatabaseError(
          res,
          error,
          `data integrity verification for ${table}`,
        );
      } else {
        sendDatabaseError(res, error, `${req.method} operation on ${table}`);
      }
    }
  };

  router.use("/:col/records", (req, res, next) => {
    // SECURITY: Strict whitelist validation for table names
    const rawTable = req.params.col;
    const table = TABLE_MAP[rawTable];
    
    if (!table) {
      logger.warn(`Invalid collection requested: '${rawTable}'`, {
        ip: req.socket.remoteAddress,
        path: req.path
      });
      return sendNotFoundError(res, `Collection '${rawTable}'`);
    }
    
    try {
      dbManager.query(`SELECT 1 FROM ${table} LIMIT 1`);
      (req as any).table = table;
      next();
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`Table access error for '${table}'`, {
        table,
        collection: req.params.col,
        error: error.message,
      });

      if (error.message.includes("no such table")) {
        return sendError(
          res,
          500,
          "Database Error",
          `Table '${table}' does not exist. Please restart the server to run migrations.`,
          ERROR_CODES.DATABASE_ERROR,
        );
      } else {
        return sendNotFoundError(
          res,
          `Collection '${req.params.col}' (${error.message})`,
        );
      }
    }
  });

  router.get("/:col/records", async (req, res) => {
    const table = (req as any).table;
    try {
      const {
        filter,
        sort,
        expand,
        page: pageParam,
        perPage: perPageParam,
      } = req.query as any;
      const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
      const perPage = perPageParam
        ? Math.min(500, Math.max(1, parseInt(perPageParam, 10)))
        : null;

      let sql = `SELECT * FROM ${table}`;
      let params: any[] = [];
      let countSql = `SELECT COUNT(*) as total FROM ${table}`;
      let countParams: any[] = [];

      let whereClause = "";
      if (filter && typeof filter === "string") {
        let match = filter.match(/([a-zA-Z0-9_]+)\s*=\s*"([^"]+)"/);
        if (!match) match = filter.match(/([a-zA-Z0-9_]+)\s*=\s*'([^']+)'/);
        if (!match) match = filter.match(/([a-zA-Z0-9_]+)\s*=\s*([^"'\s]+)/);

        if (match) {
          let key = match[1];
          const val = match[2];
          key = COLUMN_MAP[key] || key;

          if (
            !ALLOWED_COLUMNS[table] ||
            !ALLOWED_COLUMNS[table].includes(key)
          ) {
            return sendInvalidInputError(
              res,
              `Invalid filter column '${key}'. Allowed columns: ${ALLOWED_COLUMNS[table]?.join(", ") || "none"}`,
            );
          }

          whereClause = ` WHERE ${key} = ?`;
          sql += whereClause;
          countSql += whereClause;
          params.push(val);
          countParams.push(val);
        }
      }

      if (sort && typeof sort === "string") {
        const desc = sort.startsWith("-");
        let key = sort.replace(/^[+-]/, "");
        key = COLUMN_MAP[key] || key;

        if (ALLOWED_COLUMNS[table] && ALLOWED_COLUMNS[table].includes(key)) {
          sql += ` ORDER BY ${key} ${desc ? "DESC" : "ASC"}`;
        } else {
          return sendInvalidInputError(
            res,
            `Invalid sort column '${key}'. Allowed columns: ${ALLOWED_COLUMNS[table]?.join(", ") || "none"}`,
          );
        }
      }

      let totalItems: number | null = null;
      if (perPage !== null) {
        const countResult = dbManager.query<{ total: number }>(
          countSql,
          countParams,
        );
        totalItems = countResult[0]?.total || 0;
        const offset = (page - 1) * perPage;
        sql += ` LIMIT ? OFFSET ?`;
        params.push(perPage, offset);
      }

      let rows = dbManager.query<any>(sql, params);

      if (
        expand &&
        typeof expand === "string" &&
        expand.includes("photos_via_album") &&
        table === "albums"
      ) {
        rows = rows.map((album) => {
          const photos = dbManager.query(
            `SELECT * FROM photos WHERE albumId = ?`,
            [album.id],
          );
          const enhancedPhotos = photos.map((p) => ({
            ...p,
            collectionId: "photos",
            collectionName: "photos",
          }));
          return { ...album, expand: { photos_via_album: enhancedPhotos } };
        });
      }

      const parsedRows = rows.map((row) => {
        try {
          const jsonCols = JSON_COLUMNS[table] || [];
          const parsedRow = { ...row };
          jsonCols.forEach((c) => {
            if (parsedRow[c] && typeof parsedRow[c] === "string") {
              try {
                parsedRow[c] = JSON.parse(parsedRow[c]);
              } catch (e) {}
            }
          });

          parsedRow.collectionId = table;
          parsedRow.collectionName = table;

          return parsedRow;
        } catch (e) {
          return { ...row, collectionId: table, collectionName: table };
        }
      });

      const cacheControl = "private, max-age=300";

      res.header("Cache-Control", cacheControl);
      if (perPage !== null && totalItems !== null) {
        res.json({
          items: parsedRows,
          page: page,
          perPage: perPage,
          totalItems: totalItems,
          totalPages: Math.ceil(totalItems / perPage),
        });
      } else {
        res.json({ items: parsedRows });
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`GET Error for ${req.originalUrl}`, {
        error: error.message,
      });
      sendDatabaseError(res, error, `fetching records from ${table}`);
    }
  });

  router.get("/:col/records/:id", async (req, res) => {
    const table = (req as any).table;
    const id = req.params.id;

    try {
      const { expand } = req.query as any;

      const record = dbManager.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (!record) {
        return sendNotFoundError(res, `Record with ID ${id}`);
      }

      let responseData: any = { ...record };

      // Handle Expand
      if (
        expand &&
        typeof expand === "string" &&
        expand.includes("photos_via_album") &&
        table === "albums"
      ) {
        const photos = dbManager.query(
          `SELECT * FROM photos WHERE albumId = ?`,
          [id],
        );
        const enhancedPhotos = photos.map((p) => ({
          ...p,
          collectionId: "photos",
          collectionName: "photos",
        }));
        responseData.expand = { photos_via_album: enhancedPhotos };
      }

      // Parse JSON Columns
      const jsonCols = JSON_COLUMNS[table] || [];
      jsonCols.forEach((c) => {
        if (
          (responseData as any)[c] &&
          typeof (responseData as any)[c] === "string"
        ) {
          try {
            responseData[c] = JSON.parse((responseData as any)[c]);
          } catch (e) {}
        }
      });

      responseData.collectionId = table;
      responseData.collectionName = table;

      res.json(responseData);
    } catch (e: any) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error(`GET ONE Error for ${req.originalUrl}`, {
        error: error.message,
      });
      sendDatabaseError(res, error, `fetching record ${id} from ${table}`);
    }
  });

  router.post("/:col/records", async (req, res) => {
    const table = (req as any).table;
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart/form-data")) {
      const form = formidable({
        multiples: true,
        uploadDir: UPLOAD_DIR,
        keepExtensions: true,
        maxFileSize: 500 * 1024 * 1024,
      });

      form.parse(req, (err: any, fields: Fields, files: any) => {
        if (err) {
          logger.error("File upload error", { error: err.message });
          return sendFileError(res, `File upload failed: ${err.message}`);
        }

        if (!fields) fields = {};
        if (!files) files = {};

        const data: any = {};
        Object.keys(fields).forEach((key) => {
          const val = fields[key];
          const fieldValue = Array.isArray(val) ? val[0] : val;

          if (table === "photos") {
            if (key === "photographerId")
              data[key] = parseInt(fieldValue as string, 10) || 0;
            else if (key === "albumId") data[key] = String(fieldValue || "");
            else data[key] = fieldValue;
          } else if (table === "albums" && key === "photographerId") {
            data[key] = parseInt(fieldValue as string, 10) || 0;
          } else {
            data[key] = fieldValue;
          }
        });

        const fileProcessingPromises: Promise<void>[] = [];
        Object.keys(files).forEach((key) => {
          const fileArr = files[key];
          const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;

          if (file) {
            if (table === "photos" && key === "url") {
              const photoId = data.id || crypto.randomUUID();
              if (!data.id) data.id = photoId;

              const copyToImportFolder = async () => {
                try {
                  if (!file || !file.filepath || !fs.existsSync(file.filepath))
                    return;
                  if (!fs.existsSync(IMPORT_DIR))
                    fs.mkdirSync(IMPORT_DIR, { recursive: true });

                  const today = new Date();
                  const dateFolder = today.toISOString().split("T")[0];
                  const dateImportDir = path.join(IMPORT_DIR, dateFolder);
                  if (!fs.existsSync(dateImportDir))
                    fs.mkdirSync(dateImportDir, { recursive: true });

                  const originalName =
                    file.originalFilename || file.newFilename;
                  const importFilename = `${photoId}${path.extname(originalName)}`;
                  const importPath = path.join(dateImportDir, importFilename);
                  fs.copyFileSync(file.filepath, importPath);
                } catch (e: any) {
                  logger.error("Failed to copy to import folder", {
                    error: e.message,
                  });
                }
              };
              fileProcessingPromises.push(copyToImportFolder());
              data.url = file.newFilename;
              data.fileSize = file.size;
            }
          }
        });

        Promise.all(fileProcessingPromises).then(() => {
          processRecordCreation(req, res, table, data);
        });
      });
    } else {
      try {
        const data = req.body;
        processRecordCreation(req, res, table, data);
      } catch (e) {
        sendInvalidInputError(res, "Invalid JSON body");
      }
    }
  });

  router.patch("/:col/records/:id", async (req, res) => {
    const table = (req as any).table;
    try {
      const data = req.body;
      if (req.params.id && !data.id) {
        data.id = req.params.id;
      }
      processRecordCreation(req, res, table, data);
    } catch (error) {
      sendInvalidInputError(res, "Invalid JSON body");
    }
  });

  router.delete("/:col/records/:id", async (req, res) => {
    const table = (req as any).table;
    const id = req.params.id;

    if (!id) {
      return sendInvalidInputError(res, "Missing ID parameter");
    }

    if (table === "users" && id === "1") {
      return sendError(
        res,
        403,
        "Forbidden",
        "Cannot delete root admin user",
        ERROR_CODES.AUTHORIZATION_ERROR,
      );
    }

    if (table === "albums" || table === "photos") {
      if (table === "albums") {
        const album = dbManager.get<{ title: string }>(
          "SELECT title FROM albums WHERE id = ?",
          [id],
        );
        if (album && album.title && album.title.includes("Recovered")) {
          logger.info("Allowing deletion of Recovered Album", {
            albumId: id,
            title: album.title,
          });
        } else {
          return sendError(
            res,
            403,
            "Forbidden",
            "Touch backend is read-only for photos/albums",
            ERROR_CODES.AUTHORIZATION_ERROR,
          );
        }
      } else {
        return sendError(
          res,
          403,
          "Forbidden",
          "Touch backend is read-only for photos/albums",
          ERROR_CODES.AUTHORIZATION_ERROR,
        );
      }
    }

    try {
      const existing = dbManager.get(`SELECT 1 FROM ${table} WHERE id = ?`, [
        id,
      ]);
      if (!existing) {
        return sendNotFoundError(res, `Record with ID ${id}`);
      }

      dbManager.run(`DELETE FROM ${table} WHERE id = ?`, [id]);

      if (realtimeService) {
        realtimeService.broadcast({
          collection: table,
          action: "delete",
          record: { id },
        });
      }

      res.status(204).end();
    } catch (e: any) {
      sendDatabaseError(res, e, "delete operation");
    }
  });

  return router;
}
