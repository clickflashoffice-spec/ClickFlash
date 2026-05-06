// backend/shared/orphanRecovery.ts
// P2-A4 Fix: On server start, scan IMPORT_DIR for orphaned files and attempt to re-register them

import fs from "fs";
import path from "path";
import crypto from "crypto";

interface OrphanFile {
  filepath: string;
  albumId: string;
  photoId: string;
  originalFilename: string;
}

interface RecoveryResult {
  totalFound: number;
  recovered: number;
  failed: number;
  errors: string[];
}

const KNOWN_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".tiff", ".bmp"];

function isImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return KNOWN_EXTENSIONS.includes(ext);
}

async function scanForOrphans(uploadDir: string): Promise<OrphanFile[]> {
  const orphans: OrphanFile[] = [];

  if (!fs.existsSync(uploadDir)) {
    return orphans;
  }

  const entries = fs.readdirSync(uploadDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const albumId = entry.name;

    const highresDir = path.join(uploadDir, albumId, "highres");
    if (!fs.existsSync(highresDir)) continue;

    try {
      const files = fs.readdirSync(highresDir);

      for (const file of files) {
        if (!isImageFile(file)) continue;

        const filepath = path.join(highresDir, file);
        const stat = fs.statSync(filepath);

        // Check if file exists in database
        // We'll check by filename pattern (photoId is part of filename)
        const filenameWithoutExt = path.basename(file, path.extname(file));
        
        // Skip thumbnails/previews/tiny (they have suffixes)
        if (filenameWithoutExt.includes("_thumb") || 
            filenameWithoutExt.includes("_preview") || 
            filenameWithoutExt.includes("_tiny") ||
            filenameWithoutExt.includes("_wm")) {
          continue;
        }

        // This is a potential orphan - we'll return it for caller to check DB
        orphans.push({
          filepath,
          albumId,
          photoId: filenameWithoutExt,
          originalFilename: file,
        });
      }
    } catch (err) {
      console.warn(`[OrphanRecovery] Could not scan album ${albumId}:`, err);
    }
  }

  return orphans;
}

export async function recoverOrphanedFiles(
  uploadDir: string,
  dbManager: { get: (sql: string, params?: any[]) => any; run: (sql: string, params?: any[]) => void },
  photoProcessor: any,
  logger: { info: (msg: string, meta?: any) => void; warn: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void },
): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    totalFound: 0,
    recovered: 0,
    failed: 0,
    errors: [],
  };

  logger.info("[OrphanRecovery] Starting scan for orphaned files...");

  try {
    const orphans = await scanForOrphans(uploadDir);
    result.totalFound = orphans.length;

    if (orphans.length === 0) {
      logger.info("[OrphanRecovery] No orphaned files found.");
      return result;
    }

    logger.info(`[OrphanRecovery] Found ${orphans.length} potential orphaned files.`);

    for (const orphan of orphans) {
      try {
        // Check if this photo already exists in DB
        const existingPhoto = dbManager.get(
          "SELECT id FROM photos WHERE id = ? OR (album_id = ? AND storage_path = ?)",
          [orphan.photoId, orphan.albumId, orphan.filepath]
        );

        if (existingPhoto) {
          logger.info(`[OrphanRecovery] File ${orphan.photoId} already exists in DB, skipping.`);
          continue;
        }

        // Calculate hash for duplicate detection
        const fileBuffer = fs.readFileSync(orphan.filepath);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        // Check for duplicate by hash
        const duplicateByHash = dbManager.get(
          "SELECT id FROM photos WHERE file_hash = ?",
          [fileHash]
        );

        if (duplicateByHash) {
          logger.warn(`[OrphanRecovery] Duplicate detected for ${orphan.photoId} (hash: ${fileHash.substring(0, 8)}...), skipping.`);
          result.errors.push(`Duplicate hash for ${orphan.photoId}`);
          result.failed++;
          continue;
        }

        // Get album info
        const album = dbManager.get("SELECT id FROM albums WHERE id = ?", [orphan.albumId]);
        if (!album) {
          logger.warn(`[OrphanRecovery] Album ${orphan.albumId} not found for orphan ${orphan.photoId}, skipping.`);
          result.errors.push(`Album not found for ${orphan.photoId}`);
          result.failed++;
          continue;
        }

        // Attempt to process and register the orphan
        if (photoProcessor) {
          const metadata = await photoProcessor.processPhoto(
            {
              filepath: orphan.filepath,
              originalFilename: orphan.originalFilename,
            },
            orphan.albumId,
            orphan.photoId,
          );

          logger.info(`[OrphanRecovery] Successfully recovered ${orphan.photoId}`);
          result.recovered++;
        } else {
          // No photoProcessor available, just log
          logger.warn(`[OrphanRecovery] No photoProcessor available, cannot recover ${orphan.photoId}`);
          result.errors.push(`No photoProcessor for ${orphan.photoId}`);
          result.failed++;
        }
      } catch (err) {
        const error = err as Error;
        logger.error(`[OrphanRecovery] Failed to recover ${orphan.photoId}: ${error.message}`);
        result.errors.push(`${orphan.photoId}: ${error.message}`);
        result.failed++;
      }
    }

    logger.info(`[OrphanRecovery] Complete. Total: ${result.totalFound}, Recovered: ${result.recovered}, Failed: ${result.failed}`);
  } catch (err) {
    const error = err as Error;
    logger.error(`[OrphanRecovery] Fatal error during recovery: ${error.message}`);
    result.errors.push(`Fatal: ${error.message}`);
  }

  return result;
}
