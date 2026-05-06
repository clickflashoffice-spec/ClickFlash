import express, { Request, Response, Router } from "express";
import path from "path";
import os from "os";
import { ExportService } from "../services/ExportService";
import { Logger } from "../shared/logger";
import { strictRateLimiter } from "../shared/rateLimiter";
import {
  sendInvalidInputError,
  sendInternalError,
} from "../shared/errorHandler";

// Track in-progress exports per albumId to prevent concurrent export floods.
// Keyed by albumId; value is the timestamp the export started (for future TTL if needed).
const activeExports = new Map<string, number>();

/**
 * Validate that a user-supplied export target directory is safe to write to.
 * Rejects:
 *  - Non-absolute paths (relative paths could point anywhere)
 *  - Paths containing ".." segments (traversal after normalization)
 *  - Percent-encoded dots (%2e) that survive URL decoding
 *  - Paths outside the user's home directory or a temp dir (Electron desktop use)
 */
function validateExportPath(targetDir: string): { ok: true } | { ok: false; reason: string } {
  if (typeof targetDir !== "string" || !targetDir.trim()) {
    return { ok: false, reason: "targetDir must be a non-empty string" };
  }
  // Reject percent-encoded traversal sequences before normalization.
  if (/%2e/i.test(targetDir)) {
    return { ok: false, reason: "Encoded path segments are not allowed" };
  }
  if (!path.isAbsolute(targetDir)) {
    return { ok: false, reason: "targetDir must be an absolute path" };
  }
  // Normalize resolves any remaining ".." segments; check the result.
  const normalized = path.normalize(targetDir);
  if (normalized.includes("..")) {
    return { ok: false, reason: "Path traversal sequences are not allowed" };
  }
  // Restrict to user-writable roots: home directory or system temp.
  const allowedRoots = [os.homedir(), os.tmpdir()];
  const withinAllowed = allowedRoots.some((root) =>
    normalized.startsWith(path.normalize(root) + path.sep) ||
    normalized === path.normalize(root)
  );
  if (!withinAllowed) {
    return {
      ok: false,
      reason: `Export directory must be inside the user home or temp directory`,
    };
  }
  return { ok: true };
}

interface ExportContext {
  logger: Logger;
  exportService: ExportService;
}

// P0-S3 Fix: Allowed export root directories
const _ALLOWED_EXPORT_ROOTS: string[] = [
  process.env.HOME || process.env.USERPROFILE || "",
  process.env.APPDATA || "",
  process.env.TEMP || "",
].filter(Boolean);

// P0-S4 Fix: In-progress export guard per album
const _inProgressExports = new Map<string, { startTime: number; albumId: string }>();
const _EXPORT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max per export

export default function exportRoutes(context: ExportContext): Router {
  const { logger, exportService } = context;
  const router = express.Router();

  /**
   * @route POST /export/batch
   * @description Batch process photos and save to a local directory (Law 14)
   * P0-S3 Fix: Server-side path validation to prevent traversal attacks
   * P0-S4 Fix: Rate limiting and in-progress export guard
   */
  router.post("/batch", strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const { items, targetDir, options, albumId } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendInvalidInputError(
          res,
          "Items array is required and cannot be empty",
        );
      }

      if (!targetDir) {
        return sendInvalidInputError(res, "Target directory is required");
      }

      // Server-side path validation — must not rely on client-side checks alone.
      const pathCheck = validateExportPath(targetDir);
      if (!pathCheck.ok) {
        logger.warn(`[Export] Rejected unsafe targetDir: ${JSON.stringify(targetDir)} — ${pathCheck.reason}`);
        return res.status(400).json({ error: "INVALID_EXPORT_PATH", message: pathCheck.reason });
      }

      // In-progress guard: one concurrent export per album.
      const guardKey = typeof albumId === "string" && albumId ? albumId : targetDir;
      if (activeExports.has(guardKey)) {
        logger.warn(`[Export] Rejected concurrent export for key: ${guardKey}`);
        return res.status(409).json({
          error: "EXPORT_IN_PROGRESS",
          message: "An export is already running for this album. Wait for it to finish before starting another.",
        });
      }

      activeExports.set(guardKey, Date.now());
      logger.info(
        `Starting batch export of ${items.length} photos to ${targetDir}`,
      );

      let result;
      try {
        result = await exportService.exportBatch(items, targetDir, options);
      } finally {
        activeExports.delete(guardKey);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error: any) {
      logger.error("Batch export route failed", { error: error.message });
      sendInternalError(res, error.message);
    }
  });

  return router;
}
