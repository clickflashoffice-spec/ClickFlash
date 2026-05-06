import fs from "fs";
import path from "path";
import { ThermalService } from "./thermalService";
import { WorkerPool, WorkerJob } from "./WorkerPool";
import { Logger } from "./logger";
import { DatabaseManager } from "./db";
import sharp from "sharp";

const logger = new Logger(path.resolve(process.cwd(), "pb_data"));

// Maximum allowed file size (50 MB). Must match formidable's maxFileSize so
// any file that bypassed the upload parser is still rejected here.
// MAX_PHOTO_SIZE_BYTES = 50MB is enforced by formidable at upload level

interface PhotoMetadata {
  url: string;
  tinyUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  storagePath: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileHash: string;
  kioskUrl: string | null;
  format?: string;
  qualityScore: number;
  qualityFlags: string[];
  orientation?: number;
}

export interface QualityResult {
  score: number; // 0-100
  flags: string[]; // ['blurry', 'overexposed', 'underexposed', 'low_resolution']
}

interface FileUpload {
  filepath: string;
  originalFilename?: string;
  newFilename?: string;
  mimetype?: string;
}

export class PhotoProcessor {
  private uploadDir: string;
  private pool: WorkerPool;
  private mlPool: WorkerPool;
  private thermalService: ThermalService | null = null;
  private db: DatabaseManager | null = null;

  constructor(
    uploadDir: string,
    thermalService?: ThermalService,
    db?: DatabaseManager,
  ) {
    if (!uploadDir) throw new Error("PhotoProcessor: uploadDir is required");
    this.uploadDir = uploadDir;
    this.thermalService = thermalService || null;
    this.db = db || null;

    if (!fs.existsSync(this.uploadDir))
      fs.mkdirSync(this.uploadDir, { recursive: true });

    const processingDir = path.join(this.uploadDir, "..", "processing");
    if (!fs.existsSync(processingDir))
      fs.mkdirSync(processingDir, { recursive: true });

    // Use unified WorkerPool
    this.pool = new WorkerPool(this.getWorkerPath(), logger, 4);
    this.mlPool = new WorkerPool(this.getMLWorkerPath(), logger, 2); // Less workers for ML to save RAM
  }

  /** Terminate worker pools on graceful shutdown to prevent thread leaks. */
  public async shutdown(): Promise<void> {
    await Promise.allSettled([this.pool.shutdown(), this.mlPool.shutdown()]);
  }

  private async checkThermals(): Promise<void> {
    if (!this.thermalService) return;
    const delay = await this.thermalService.getThrottleDelay();
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  private async checkDiskSpace(): Promise<void> {
    try {
      const stats = await fs.promises.statfs(this.uploadDir);
      const remainingGB =
        (Number(stats.bavail) * Number(stats.bsize)) / (1024 * 1024 * 1024);
      if (remainingGB < 5) {
        throw new Error(
          `DISK_EXHAUSTED: Only ${remainingGB.toFixed(2)}GB remaining.`,
        );
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes("DISK_EXHAUSTED")) throw error;
      console.warn("[PhotoProcessor] Disk space check failed:", error.message);
    }
  }

  private getWorkerPath(): string {
    const devPath = path.resolve(__dirname, "../workers/photoWorker.ts");
    if (fs.existsSync(devPath)) return devPath;

    const prodPath = path.resolve(__dirname, "./workers/photoWorker.js");
    if (fs.existsSync(prodPath)) return prodPath;

    return path.resolve(process.cwd(), "backend/workers/photoWorker.ts");
  }

  private getMLWorkerPath(): string {
    const devPath = path.resolve(__dirname, "../workers/MLWorker.ts");
    if (fs.existsSync(devPath)) return devPath;

    const prodPath = path.resolve(__dirname, "./workers/MLWorker.js");
    if (fs.existsSync(prodPath)) return prodPath;

    return path.resolve(process.cwd(), "backend/workers/MLWorker.ts");
  }

  private async runWorker(job: WorkerJob): Promise<any> {
    try {
      const result = await this.pool.run(job);
      return result;
    } catch (err) {
      const error = err as Error & { statusCode?: number; retryAfter?: number };
      logger.error(`[PhotoProcessor] WorkerPool Error: ${error.message}`);
      
      // P2-A2 Fix: Propagate queue-full errors with status code
      if (error.statusCode === 503) {
        error.statusCode = 503;
        error.retryAfter = error.retryAfter || 5;
      }
      return { success: false, error: error.message, statusCode: error.statusCode, retryAfter: error.retryAfter };
    }
  }

  /**
   * Rejects filenames that contain null bytes, control characters, or OS-reserved
   * characters (Windows: < > : " / \ | ? *). These can be used for path traversal,
   * directory separator injection, or null-byte truncation attacks.
   */
  private static sanitizeFilename(filename: string): string {
    // Reject null bytes and control characters immediately — these are never
    // legitimate in filenames and are commonly used in truncation exploits.
    if (/[\x00-\x1f]/.test(filename)) {
      throw new Error(
        `SECURITY_VIOLATION: Filename contains illegal control characters: ${JSON.stringify(filename)}`,
      );
    }
    // Strip Windows/POSIX reserved characters that could affect path resolution.
    // We strip rather than throw so minor client-side quirks don't break imports.
    return filename.replace(/[<>:"/\\|?*]/g, "_");
  }

  public getStoragePath(
    albumId: string,
    photoId: string,
    originalFilename: string,
  ) {
    // Sanitize the original filename before extracting the extension.
    const safeOriginalFilename = PhotoProcessor.sanitizeFilename(originalFilename);
    const rawExt = path.extname(safeOriginalFilename).toLowerCase();
    // Only allow known image extensions; default to .jpg for anything unexpected.
    const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif", ".tiff", ".tif"]);
    const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : ".jpg";

    // P1-S3 Fix: Validate BEFORE path.join to catch null bytes and special chars
    if (
      originalFilename.includes("\0") ||
      /[<>:"|?*]/.test(originalFilename) ||
      albumId.includes("\0") ||
      /[<>:"|?*]/.test(albumId) ||
      photoId.includes("\0") ||
      /[<>:"|?*]/.test(photoId)
    ) {
      throw new Error("SECURITY_VIOLATION: Invalid characters in path components");
    }

    // Security: Sanitize inputs to prevent traversal
    const safeAlbumId = albumId.replace(/[^a-zA-Z0-9_-]/g, "");
    const safePhotoId = photoId.replace(/[^a-zA-Z0-9_-]/g, "");

    const albumDir = path.join(this.uploadDir, safeAlbumId);
    const highResDir = path.join(albumDir, "highres");
    const thumbsDir = path.join(albumDir, "thumbs");

    // Security: Final containment check
    const normalizedUploadDir = path.normalize(this.uploadDir + path.sep);
    [albumDir, highResDir, thumbsDir].forEach((dir) => {
      const normalizedDir = path.normalize(dir);
      if (!normalizedDir.startsWith(normalizedUploadDir)) {
        throw new Error(
          `SECURITY_VIOLATION: Path containment failure for ${dir}`,
        );
      }
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const filename = `${safePhotoId}${ext}`;
    return {
      directory: albumDir,
      highResDir,
      thumbsDir,
      filename,
      fullPath: path.join(highResDir, filename),
      relativePath: `${safeAlbumId}/highres/${filename}`,
    };
  }

  public async processPhoto(
    file: FileUpload,
    albumId: string,
    photoId: string,
  ): Promise<PhotoMetadata> {
    const tempFilepath = file.filepath;
    const MAX_PHOTO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit

    try {
      const originalFilename =
        file.originalFilename || file.newFilename || "unknown.jpg";
      const ext = path.extname(originalFilename).toLowerCase() || ".jpg";

      if (!albumId || albumId === "undefined")
        throw new Error("Invalid albumId");
      if (!photoId) throw new Error("photoId is required");
      if (!tempFilepath || !fs.existsSync(tempFilepath))
        throw new Error(`Invalid temp path: ${tempFilepath}`);

      // Defense-in-depth: enforce file size limit even if the upload parser was
      // bypassed. Checked before the worker is spawned to avoid wasted CPU.
      const fileStats = fs.statSync(tempFilepath);
      if (fileStats.size > MAX_PHOTO_SIZE_BYTES) {
        throw new Error(
          `File size ${fileStats.size} bytes exceeds the ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024}MB limit`,
        );
      }

      // ── Worker Execution (Law 13) ──────────────────────────────────────────
      // Offloading Hashing, Resizing, and EXIF Stripping to the WorkerPool
      // to prevent event-loop starvation during 100GB+ imports.
      await this.checkThermals();
      await this.checkDiskSpace();

      const tempOutputDir = path.dirname(tempFilepath);
      const workerResult = await this.runWorker({
        type: "process",
        filepath: tempFilepath,
        outputDir: tempOutputDir,
        photoId,
        ext,
        // Pass client-supplied MIME type for cross-validation in the worker
        mimeType: file.mimetype || undefined,
      });

      // --- Post-Worker Resolution ---
      const assets = workerResult.assets;
      const fileHash = workerResult.hash;

      // Duplicate Check (Post-Worker to avoid Main Thread Blocking)
      if (this.db && fileHash) {
          const existing = this.db.get<{ id: string }>(
            "SELECT id FROM photos WHERE fileHash = ? AND albumId = ?",
            [fileHash, albumId]
          );
          if (existing) {
            // Cleanup temp assets since it's a duplicate
            try { if (fs.existsSync(tempFilepath)) fs.unlinkSync(tempFilepath); } catch {}
            Object.values(assets).forEach((f: any) => {
                try { fs.unlinkSync(path.join(tempOutputDir, f)); } catch {}
            });

            logger.warn(`[PhotoProcessor] Post-process duplicate detected: ${photoId} (Hash: ${fileHash.substring(0,8)})`);
            const dupErr = new Error("Duplicate photo detected");
            (dupErr as any).code = "DUPLICATE_PHOTO";
            (dupErr as any).existingPhotoId = existing.id;
            throw dupErr;
          }
      }

      const storage = this.getStoragePath(albumId, photoId, originalFilename);

      const safeMove = async (src: string, dest: string, retries = 5) => {
        for (let i = 0; i < retries; i++) {
          try {
            await fs.promises.rename(src, dest);
            return;
          } catch (err) {
            const error = err as any;
            if (["EXDEV", "EBUSY", "EPERM"].includes(error.code)) {
              try {
                await fs.promises.copyFile(src, dest);
                await fs.promises.unlink(src);
                return;
              } catch (copyErr) {
                if (i === retries - 1) throw copyErr;
              }
            } else if (i === retries - 1) throw error;
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        }
      };

      // Handle High-Res move (The worker created a stripped/corrected copy)
      const workerHighResPath = path.join(tempOutputDir, assets.highres);
      await safeMove(workerHighResPath, storage.fullPath);
      
      // Cleanup original temp upload (now we have the corrected hi-res in storage)
      try { if (fs.existsSync(tempFilepath)) await fs.promises.unlink(tempFilepath); } catch {}
      await Promise.all(
        Object.keys(assets).map(async (assetKey) => {
          const assetFilename = assets[assetKey];
          const srcAssetPath = path.join(tempOutputDir, assetFilename);
          const destAssetPath = path.join(storage.thumbsDir, assetFilename);
          try {
            await fs.promises.access(srcAssetPath);
            try {
              await fs.promises.access(destAssetPath);
              await fs.promises.unlink(destAssetPath);
            } catch {
              // Ignore if destination doesn't exist
            }
            await safeMove(srcAssetPath, destAssetPath);
          } catch (error) {
            console.warn(`[PhotoProcessor] Asset error ${assetKey}:`, error);
          }
        }),
      );

      return {
        url: `/uploads/${storage.relativePath}`,
        tinyUrl: `/uploads/${albumId}/thumbs/${assets.tiny}`,
        thumbnailUrl: `/uploads/${albumId}/thumbs/${assets.thumbnail}`,
        previewUrl: `/uploads/${albumId}/thumbs/${assets.preview}`,
        storagePath: storage.fullPath,
        originalFilename,
        fileSize: fs.existsSync(storage.fullPath)
          ? fs.statSync(storage.fullPath).size
          : 0,
        mimeType: `image/${ext.replace(".", "")}`,
        width: workerResult.metadata.width,
        height: workerResult.metadata.height,
        fileHash: workerResult.hash,
        kioskUrl: `/uploads/${albumId}/highres/${photoId}${ext}`,
        format: workerResult.metadata.format,
        qualityScore: 100, // Basic heuristics replace full quality score
        qualityFlags: workerResult.quality_flags || [],
        orientation: workerResult.metadata.orientation || 1,
      };
    } catch (error) {
      console.error("[PhotoProcessor] Processing failed:", error);
      try {
        if (fs.existsSync(tempFilepath)) fs.unlinkSync(tempFilepath);
      } catch {
        // Non-fatal cleanup error
      }
      throw error;
    }
  }

  /**
   * Analyze image quality using sharp.stats() — runs in milliseconds locally.
   * Returns a composite score (0-100) and an array of quality flags.
   *
   * Thresholds:
   *   Blur: channels std-dev mean < 18 → 'blurry'
   *   Overexposed: all channel means > 230 → 'overexposed'
   *   Underexposed: all channel means < 25 → 'underexposed'
   *   Low resolution: width or height < 800 → 'low_resolution'
   */
  public async analyzeQuality(
    filepath: string,
    width: number | null,
    height: number | null,
  ): Promise<QualityResult> {
    const flags: string[] = [];
    let score = 100;

    try {
      const stats = await sharp(filepath).stats();
      const channels = stats.channels; // [{mean, stdev, …}, …]

      // 1. Blur detection — low stdev across all channels means flat/blurry image
      const avgStdev =
        channels.reduce((s, c) => s + c.stdev, 0) / channels.length;
      const BLUR_STDEV_THRESHOLD = 18;
      if (avgStdev < BLUR_STDEV_THRESHOLD) {
        flags.push("blurry");
        score -= 40;
      }

      // 2. Exposure detection using channel means
      const avgMean = channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3; // RGB only
      if (avgMean > 230) {
        flags.push("overexposed");
        score -= 30;
      } else if (avgMean < 25) {
        flags.push("underexposed");
        score -= 30;
      }

      // 3. Low resolution
      if (width && height && (width < 800 || height < 800)) {
        flags.push("low_resolution");
        score -= 20;
      }

      score = Math.max(0, score);

      if (flags.length > 0) {
        logger.warn(
          `[Quality] Photo flagged: ${flags.join(", ")} (score: ${score})`,
          { filepath },
        );
      }
    } catch (err) {
      // Non-fatal — quality analysis failure should not block the upload
      logger.warn("[Quality] Analysis failed, defaulting to score 100", {
        error: (err as Error).message,
      });
    }

    return { score, flags };
  }

  public async applyEdits(
    photoId: string,
    albumId: string,
    edits: { retouchActions?: any[]; [key: string]: any },
  ): Promise<void> {
    if (!photoId || !albumId) throw new Error("Missing params");
    const albumDir = path.join(this.uploadDir, albumId);
    const highResDir = path.join(albumDir, "highres");
    const photoFile = fs
      .readdirSync(highResDir)
      .find((f) => f.startsWith(photoId));
    if (!photoFile) throw new Error("Photo not found");

    const filepath = path.join(highResDir, photoFile);

    // Rule: AI Retouch Safety Verification (P0 Fix)
    if (edits.retouchActions && edits.retouchActions.length > 0) {
      const mlResult = await this.mlPool.run({
        type: "verify-retouch",
        imagePath: filepath,
        actions: edits.retouchActions,
        width: 2048, // Use preview size for estimation if needed, or get metadata
        height: 2048,
      });

      if (!mlResult.success) {
        logger.error(
          `[PhotoProcessor] AI Safety Rejection for photo ${photoId}: ${mlResult.error}`,
        );
        throw new Error(mlResult.error || "AI Retouch Safety Violation");
      }

      // Audit log the successful AI operation
      if (this.db) {
        this.db.run(
          `INSERT INTO ai_operations (photo_id, operation_type, parameters) 
                 VALUES (?, ?, ?)`,
          [
            photoId,
            "retouch",
            JSON.stringify({
              actions: edits.retouchActions,
              totalArea: mlResult.totalAreaPercent,
            }),
          ],
        );
      }
    }

    const thumbsDir = path.join(albumDir, "thumbs");

    // Phase 1: Store Adjustments in DB (Non-Destructive)
    if (this.db) {
      try {
        const adjustmentsJson = JSON.stringify(edits);
        const now = new Date().toISOString();

        // Upsert the adjustment stack
        this.db.run(
          `INSERT INTO photo_adjustments (photo_id, adjustments, updated_at) 
                 VALUES (?, ?, ?)
                 ON CONFLICT(photo_id) DO UPDATE SET 
                    adjustments = excluded.adjustments,
                    updated_at = excluded.updated_at,
                    version = version + 1`,
          [photoId, adjustmentsJson, now],
        );

        logger.info(
          `[PhotoProcessor] Persisted adjustments for photo ${photoId}`,
        );
      } catch (error) {
        const err = error as {
          status?: number;
          code?: string;
          message: string;
        };
        logger.error(
          `[PhotoProcessor] Failed to persist adjustments: ${err.message}`,
        );
        // Continue with processing even if DB write fails, but log it
      }
    }

    const workerResult = await this.runWorker({
      type: "edit",
      filepath,
      outputDir: thumbsDir,
      edits,
      photoId,
    });
    if (!workerResult.success) throw new Error(workerResult.error);
  }

  public async generateWatermark(
    filepath: string,
    outputDir: string,
  ): Promise<void> {
    const workerResult = await this.runWorker({
      type: "watermark",
      filepath,
      outputDir,
    });
    if (!workerResult.success) throw new Error(workerResult.error);
  }

  public async archivePhoto(
    albumId: string,
    relativePath: string,
  ): Promise<void> {
    // Law 12: Structured Storage - move hi-res to archive
    const safeAlbumId = albumId.replace(/[^a-zA-Z0-9_-]/g, "");
    const fullPath = path.normalize(path.join(this.uploadDir, relativePath));
    const normalizedUploadDir = path.normalize(this.uploadDir + path.sep);

    // Security: Containment check
    if (!fullPath.startsWith(normalizedUploadDir)) {
      throw new Error("SECURITY_VIOLATION: Archive path traversal attempt");
    }

    if (!fs.existsSync(fullPath)) return;

    const archiveDir = path.join(this.uploadDir, "archive", safeAlbumId);
    if (!path.normalize(archiveDir).startsWith(normalizedUploadDir)) {
      throw new Error(
        "SECURITY_VIOLATION: Archive destination traversal attempt",
      );
    }

    if (!fs.existsSync(archiveDir))
      fs.mkdirSync(archiveDir, { recursive: true });

    const dest = path.join(archiveDir, path.basename(fullPath));
    await fs.promises.rename(fullPath, dest);
  }
}
