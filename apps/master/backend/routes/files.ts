// backend/routes/files.ts
// Files Routes

import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import formidable from "formidable";
import {
  sendInvalidInputError,
  sendNotFoundError,
  sendFileError,
  sendInternalError,
  ERROR_CODES,
} from "../shared/errorHandler";
import { UPLOAD_DIR } from "../config/constants";
import DatabaseManager from "../shared/db";
import { Logger } from "../shared/logger";

import { PhotoProcessor } from "../shared/photoProcessor";

interface FilesContext {
  logger: Logger;
  dbManager: DatabaseManager;
  photoProcessor: PhotoProcessor;
  networkMonitor?: any;
}

export default function fileRoutes(context: FilesContext): Router {
  const { logger, dbManager } = context;
  const router = express.Router();

  /**
   * @route GET /files/*
   * @description Serve static files (photos, uploads)
   */
  router.get(/\/files\/(.*)/, async (req: Request, res: Response) => {
    const pathName = req.originalUrl;

    // Manual parsing to replicate original logic exactly
    const parts = pathName.split("/").filter((p) => p);
    const fileIndex = parts.indexOf("files");

    // Fix: Allow 2+ parts (collection/filename) instead of strictly 3+
    const pathAfterFiles = parts.slice(fileIndex + 1);

    if (fileIndex === -1 || pathAfterFiles.length < 2) {
      sendFileError(
        res,
        "Invalid file path format. Expected: /api/files/{collection}/{...path}",
        ERROR_CODES.AUTHORIZATION_ERROR,
      );
      return;
    }

    const collection = pathAfterFiles[0];
    const recordId = pathAfterFiles[1]; // Might be filename if length is 2
    // relativeFilePath is everything after collection/recordId (if exists)
    const relativeFilePath = pathAfterFiles.slice(2).join("/");

    // Security: Directory traversal
    if (
      (relativeFilePath && relativeFilePath.includes("..")) ||
      collection.includes("..") ||
      recordId.includes("..")
    ) {
      sendFileError(
        res,
        "Invalid file path. Directory traversal is not allowed.",
        ERROR_CODES.AUTHORIZATION_ERROR,
      );
      return;
    }

    const targetDir = UPLOAD_DIR;

    // 1. Try structured path: UPLOAD_DIR + all parts after 'files'
    let filepath = path.join(targetDir, ...pathAfterFiles);

    // 2. Fallback to direct path (legacy/logo behavior): UPLOAD_DIR/filename
    try {
      await fs.promises.access(filepath, fs.constants.F_OK);
    } catch {
      // Standard paths failed. Try "Smart Resolution" (Hybrid Storage)
      let found = false;

      // Attempt 1: Trusted Relative Path
      const directPath = path.join(targetDir, relativeFilePath);
      if (fs.existsSync(directPath)) {
        filepath = directPath;
        found = true;
      }

      // Attempt 2: Smart Structure Fallback
      if (!found && collection === "photos" && recordId) {
        try {
          const photo = dbManager.get<{ albumId: string }>(
            `SELECT albumId FROM photos WHERE id = ?`,
            [recordId],
          );
          if (photo && photo.albumId) {
            // Normalize paths for reliable matching
            const normalizedRelative = relativeFilePath.replace(/\\/g, "/");

            // We need to check THREE locations to likely find the file:
            // 1. albums/<albumId>/thumbs/<filename> (New thumbs)
            // 2. albums/<albumId>/highres/<filename> (New originals)
            // 3. albums/<albumId>/<filename> (Legacy flat)
            const justFilename = path.basename(normalizedRelative);
            const baseFilename = justFilename.split(".")[0];
            const extensions = [".jpg", ".png", ".webp", ".jpeg"];

            // Possible Candidates with potential extension mismatches
            const cadidates: string[] = [];

            // Add exact match first
            cadidates.push(
              path.join(targetDir, photo.albumId, "thumbs", justFilename),
            );
            cadidates.push(
              path.join(targetDir, photo.albumId, "highres", justFilename),
            );
            cadidates.push(path.join(targetDir, photo.albumId, justFilename));

            // Add variants for common extensions
            for (const ext of extensions) {
              const variant = `${baseFilename}${ext}`;
              if (variant === justFilename) continue; // Skip already added

              cadidates.push(
                path.join(targetDir, photo.albumId, "thumbs", variant),
              );
              cadidates.push(
                path.join(targetDir, photo.albumId, "highres", variant),
              );
              cadidates.push(path.join(targetDir, photo.albumId, variant));
            }

            // If the requested path explicitly asked for a thumbnail variant (e.g. _tiny.webp, _thumb.jpg)
            // we should prioritize the 'thumbs' folder.
            if (
              justFilename.includes("_tiny") ||
              justFilename.includes("_thumb") ||
              justFilename.includes("_preview")
            ) {
              // Already prioritized in list above [0]
            }

            for (const candidate of cadidates) {
              if (fs.existsSync(candidate)) {
                filepath = candidate;
                found = true;
                logger.debug(
                  `[SmartResolve] Redirected ${relativeFilePath} -> ${candidate}`,
                );
                break;
              }
            }
          }
        } catch (dbError) {
          // Ignore DB errors, just 404
        }
      } else if (!found) {
        filepath = directPath; // Keep default for error reporting
      }
    }

    const normalizedTargetDir = path.resolve(targetDir);
    const normalizedFilepath = path.resolve(filepath);

    // Security check: Ensure resolved path is strictly inside UPLOAD_DIR.
    // Append sep so /uploads never accidentally matches /uploads2 etc.
    if (!normalizedFilepath.startsWith(normalizedTargetDir + path.sep) &&
        normalizedFilepath !== normalizedTargetDir) {
      sendFileError(
        res,
        "Invalid file path. Security check failed.",
        ERROR_CODES.AUTHORIZATION_ERROR,
      );
      return;
    }

    try {
      // Check existence and get stats in one go
      const stats = await fs.promises.stat(filepath);

      const ext = path.extname(relativeFilePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";

      const etag = crypto
        .createHash("md5")
        .update(`${filepath}-${stats.mtime.getTime()}-${stats.size}`)
        .digest("hex");
      const lastModified = stats.mtime.toUTCString();

      // Law 07/08/09: Add Content MD5 for sync verification
      const fileContent = await fs.promises.readFile(filepath);
      const contentHash = crypto
        .createHash("md5")
        .update(fileContent)
        .digest("hex");

      if (
        req.headers["if-none-match"] === etag ||
        req.headers["if-modified-since"] === lastModified
      ) {
        res.writeHead(304, {
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=86400",
          "X-File-MD5": contentHash,
        });
        res.end();
        return;
      }

      // Handle Range Requests (Chunked Transfer)
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = end - start + 1;

        if (start >= stats.size || end >= stats.size) {
          res.writeHead(416, {
            "Content-Range": `bytes */${stats.size}`,
          });
          res.end();
          return;
        }

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stats.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": contentType,
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=86400",
          "X-File-MD5": contentHash,
        });

        const stream = fs.createReadStream(filepath, { start, end });
        stream.pipe(res);
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": stats.size,
        ETag: etag,
        "Last-Modified": lastModified,
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
        "X-File-MD5": contentHash,
      });

      // Record event
      const startTime = Date.now();
      const stream = fs.createReadStream(filepath);
      stream.on("end", () => {
        context.networkMonitor?.recordEvent({
          bytes: stats.size,
          duration: Date.now() - startTime,
          type: "upload",
          success: true,
        });
      });
      stream.pipe(res);
    } catch (err) {
      // File not found or other error
      logger.warn("File not found", {
        filepath,
        collection,
        recordId,
        relativeFilePath,
        endpoint: pathName,
      });
      sendNotFoundError(res, `File '${relativeFilePath}'`);
    }
  });

  /**
   * @route POST /settings/logo
   * @description Upload logo
   */
  router.post("/settings/logo", (req: Request, res: Response) => {
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        logger.error("Logo upload error", { error: err.message });
        sendInternalError(res, `Upload failed: ${err.message}`);
        return;
      }

      const file = Array.isArray(files.logo) ? files.logo[0] : files.logo;
      if (!file) {
        sendInvalidInputError(res, "No logo file uploaded");
        return;
      }

      const ext = path.extname(
        file.originalFilename || file.newFilename || ".png",
      );
      const destPath = path.join(UPLOAD_DIR, `logo${ext}`);

      try {
        // Remove old logos (Async)
        const exts = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
        await Promise.all(
          exts.map(async (e) => {
            const oldPath = path.join(UPLOAD_DIR, `logo${e}`);
            try {
              await fs.promises.access(oldPath);
              await fs.promises.unlink(oldPath);
            } catch (e) {
              // Ignore if not present
            }
          }),
        );

        // Move new file (Async)
        await fs.promises.copyFile(file.filepath, destPath);
        try {
          await fs.promises.unlink(file.filepath);
        } catch (e) {
          logger.warn(`Failed to cleanup temp file ${file.filepath}:`, {
            error: e instanceof Error ? e.message : String(e),
          });
        }

        const logoUrl = `/api/files/uploads/logo/logo${ext}`;
        const settingsRow = dbManager.get(
          "SELECT * FROM settings WHERE key = 'logoUrl'",
        );
        if (settingsRow) {
          dbManager.run("UPDATE settings SET value = ? WHERE key = 'logoUrl'", [
            logoUrl,
          ]);
        } else {
          dbManager.run(
            "INSERT INTO settings (key, value, created_at, updated_at) VALUES ('logoUrl', ?, ?, ?)",
            [logoUrl, new Date().toISOString(), new Date().toISOString()],
          );
        }

        logger.info("Logo uploaded", { path: destPath });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, url: logoUrl }));
      } catch (moveErr: any) {
        logger.error("Failed to save logo", moveErr);
        sendInternalError(res, `Failed to save logo: ${moveErr.message}`);
      }
    });
  });

  /**
   * @route GET /settings/logo
   * @description Get logo URL
   */
  router.get("/settings/logo", (req: Request, res: Response) => {
    try {
      const settingsRow = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'logoUrl'",
      );
      let logoUrl = settingsRow?.value;

      if (!logoUrl) {
        const exts = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
        for (const ext of exts) {
          if (fs.existsSync(path.join(UPLOAD_DIR, `logo${ext}`))) {
            logoUrl = `/api/files/uploads/logo/logo${ext}`;
            break;
          }
        }
      }

      if (logoUrl) {
        res.writeHead(302, { Location: logoUrl });
        res.end();
      } else {
        // Fallback to default logo if exists in public/assets or root public
        const defaultPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(defaultPath)) {
          res.sendFile(defaultPath);
        } else {
          // If no file, at least don't 404, send a generic placeholder or redirect to relative frontend path
          res.writeHead(302, { Location: "/logo.png" });
          res.end();
        }
      }
    } catch (err: any) {
      logger.error("Error fetching logo", { error: err.message });
      sendInternalError(res, err.message);
    }
  });

  /**
   * @route POST /process-heavy
   * @description Trigger heavy processing (watermark, thumbnail) via worker pool
   * @deprecated Legacy endpoint. Use standard import flow.
   */
  router.post("/process-heavy", async (req: Request, res: Response) => {
    try {
      const { type, payload } = req.body;
      if (!type || !payload || !payload.photoId) {
        return sendInvalidInputError(res, "Type and photoId are required");
      }

      const photo = dbManager.get<{
        url: string;
        originalFilename: string;
        albumId: string;
      }>("SELECT url, originalFilename, albumId FROM photos WHERE id = ?", [
        payload.photoId,
      ]);

      if (!photo) {
        return sendNotFoundError(res, `Photo ${payload.photoId}`);
      }

      // Legacy support stub
      // const photoPath = context.photoProcessor.getFilePath(photo);

      if (type === "watermark") {
        // context.photoProcessor.generateWatermark(photoPath, outputDir, payload.photoId);
        logger.warn(
          "[ProcessHeavy] Watermark generation request ignored (Legacy API)",
        );
      } else if (type === "thumbnail") {
        // processPhoto handles thumbnail/preview/tiny generation
        // Re-construct file object if possible, but strict path requirements might fail
        /*
                const fileObj = {
                    filepath: photoPath,
                    originalFilename: photo.originalFilename
                };
                await context.photoProcessor.processPhoto(fileObj, photo.albumId, payload.photoId);
                */
        logger.warn(
          "[ProcessHeavy] Thumbnail regeneration request ignored (Legacy API)",
        );
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ success: true, message: "Legacy endpoint stubbed" }),
      );
    } catch (error: any) {
      logger.error("Heavy processing failed", { error: error.message });
      sendInternalError(res, error.message);
    }
  });

  return router;
}
