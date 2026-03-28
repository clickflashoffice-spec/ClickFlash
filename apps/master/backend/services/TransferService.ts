import path from "path";
import fs from "fs";
import { Logger } from "../shared/logger";
import DatabaseManager from "../shared/db";
import { UPLOAD_DIR, IMPORT_DIR } from "../config/constants";
import { limitConcurrency } from "../shared/limitConcurrency";
import { v4 as uuidv4 } from "uuid";

interface TransferContext {
  dbManager: DatabaseManager;
  logger: Logger;
  wss?: any;
}

interface TransferResult {
  success: boolean;
  copiedCount: number;
  destinations: string[];
  errors?: string[];
}

export class TransferService {
  private dbManager: DatabaseManager;
  private logger: Logger;
  private wss?: any; // WebSocket Server for progress updates

  constructor(context: TransferContext) {
    this.dbManager = context.dbManager;
    this.logger = context.logger;
    this.wss = context.wss;
  }

  /**
   * Law 01 & 06: Harden path authorization.
   * Only allows pushes to registered kiosks or paths containing standard Touch App structure.
   */
  private isAuthorizedPath(destinationPath: string): boolean {
    const normalized = path
      .normalize(destinationPath)
      .replace(/\\/g, "/")
      .toLowerCase();

    // 1. Check against registered kiosks in DB
    const registeredKiosks = this.dbManager.query<{
      settings: string;
      uploadFolderPath?: string;
    }>("SELECT settings, uploadFolderPath FROM kiosks");

    for (const kiosk of registeredKiosks) {
      if (
        kiosk.uploadFolderPath &&
        path
          .normalize(kiosk.uploadFolderPath)
          .replace(/\\/g, "/")
          .toLowerCase() === normalized
      ) {
        return true;
      }
      if (kiosk.settings) {
        try {
          const s =
            typeof kiosk.settings === "string"
              ? JSON.parse(kiosk.settings)
              : kiosk.settings;
          if (
            s.touchImportPath &&
            path
              .normalize(s.touchImportPath)
              .replace(/\\/g, "/")
              .toLowerCase() === normalized
          )
            return true;
          if (
            s.uploadFolderPath &&
            path
              .normalize(s.uploadFolderPath)
              .replace(/\\/g, "/")
              .toLowerCase() === normalized
          )
            return true;
        } catch (e) {
          // Ignore JSON parse errors in settings
        }
      }
    }

    // 2. Global Safety Fallback (must be a Touch App structure)
    // Rule 06: Touch reads ONLY from its local upload folder.
    return (
      normalized.includes("touch app python/local/uploads") ||
      normalized.includes("touch-app/local/uploads") ||
      normalized.endsWith("/local/uploads")
    );
  }

  /**
   * Phase P5: Enqueue a background transfer job.
   * Returns the job ID immediately.
   */
  public async enqueueTransfer(
    albumId: string,
    destinations: Set<string>,
    photoIds?: string[],
  ): Promise<string[]> {
    const jobIds: string[] = [];

    for (const dest of destinations) {
      if (!this.isAuthorizedPath(dest)) {
        this.logger.error(
          "SECURITY_VIOLATION: Unauthorized transfer enqueued",
          { path: dest },
        );
        continue;
      }

      const jobId = uuidv4();
      this.dbManager.run(
        `INSERT INTO kiosk_transfer_queue (id, album_id, destination_path, photo_ids, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          jobId,
          albumId,
          dest,
          photoIds ? JSON.stringify(photoIds) : null,
          "pending",
        ],
      );
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Processes a single transfer job from the queue.
   */
  public async processTransferJob(jobId: string): Promise<void> {
    const job = this.dbManager.get<{
      album_id: string;
      destination_path: string;
      photo_ids: string;
    }>(
      "SELECT album_id, destination_path, photo_ids FROM kiosk_transfer_queue WHERE id = ?",
      [jobId],
    );

    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      this.dbManager.run(
        "UPDATE kiosk_transfer_queue SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [jobId],
      );

      const photoIds = job.photo_ids ? JSON.parse(job.photo_ids) : undefined;

      // Reuse existing send logic but specialized for one destination
      const result = await this.sendAlbumToKiosks(
        job.album_id,
        new Set([job.destination_path]),
        photoIds,
      );

      if (result.success) {
        this.dbManager.run(
          "UPDATE kiosk_transfer_queue SET status = 'completed', progress = 100, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [jobId],
        );
      } else {
        throw new Error(result.errors?.join("; ") || "Unknown transfer error");
      }
    } catch (err: any) {
      this.logger.error(
        `[TransferService] Job ${jobId} failed: ${err.message}`,
      );
      this.dbManager.run(
        "UPDATE kiosk_transfer_queue SET status = 'failed', error_log = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [err.message, jobId],
      );
      throw err;
    }
  }

  /**
   * Sends an album and its photos to the specified destination paths (Kiosks).
   * optimized for Law 15 (100GB+ Scale) using batch fetching and concurrent copying.
   */
  public async sendAlbumToKiosks(
    albumId: string,
    destinations: Set<string>,
    photoIds?: string[],
  ): Promise<TransferResult> {
    // 1. Fetch Photos
    let query = "SELECT * FROM photos WHERE albumId = ?";
    const params: any[] = [albumId];

    if (photoIds && Array.isArray(photoIds) && photoIds.length > 0) {
      const placeholders = photoIds.map(() => "?").join(",");
      query += ` AND id IN (${placeholders})`;
      params.push(...photoIds);
    }

    const photos = this.dbManager.query<any>(query, params);
    if (photos.length === 0)
      throw new Error("No photos found to send (check selection)");

    // 2. Batch Fetch Face Descriptors (N+1 Optimization)
    const photoIdMap = new Map<string | number, any>();
    photos.forEach((p) => photoIdMap.set(p.id, p));

    const photoIdsToFetch = photos.map((p) => p.id);
    // Removed unused 'placeholders' variable

    // We might need to chunk this if > 999 items due to SQLite limits,
    // but for now let's assume valid range or implement simple chunking.
    const BATCH_SIZE = 900;
    const faceMap = new Map<string | number, any[]>();

    for (let i = 0; i < photoIdsToFetch.length; i += BATCH_SIZE) {
      const chunk = photoIdsToFetch.slice(i, i + BATCH_SIZE);
      const chunkPlaceholders = chunk.map(() => "?").join(",");

      try {
        const faces = this.dbManager.query<{
          photoId: number | string;
          descriptor: string;
        }>(
          `SELECT photoId, descriptor FROM photo_faces WHERE photoId IN (${chunkPlaceholders})`,
          chunk,
        );

        faces.forEach((f) => {
          const existing = faceMap.get(f.photoId) || [];
          try {
            existing.push(JSON.parse(f.descriptor));
            faceMap.set(f.photoId, existing);
          } catch (e) {
            /* ignore parse error */
          }
        });
      } catch (err: any) {
        this.logger.warn(`Failed to fetch face batch: ${err.message}`);
      }
    }

    const totalPhotos = photos.length;
    const errors: string[] = [];
    let successfulDestinations = 0;
    let totalCopied = 0;

    // 3. Process Destintations
    for (const touchImportPath of destinations) {
      try {
        // Security: Validate touch import path
        if (!this.isAuthorizedPath(touchImportPath)) {
          this.logger.error(
            "SECURITY_VIOLATION: Unauthorized kiosk destination attempt",
            { path: touchImportPath },
          );
          errors.push(`Unauthorized destination path: ${touchImportPath}`);
          continue;
        }

        // Ensure Directory Structure
        if (!fs.existsSync(touchImportPath)) {
          try {
            fs.mkdirSync(touchImportPath, { recursive: true });
          } catch (e) {
            errors.push(`Path not accessible: ${touchImportPath}`);
            continue;
          }
        }

        const folderName = albumId.startsWith("album-")
          ? albumId
          : `album-${albumId}`;
        const albumDir = path.join(touchImportPath, folderName);
        const photosDir = path.join(albumDir, "photos");

        if (!fs.existsSync(albumDir))
          fs.mkdirSync(albumDir, { recursive: true });
        if (!fs.existsSync(photosDir))
          fs.mkdirSync(photosDir, { recursive: true });

        // 4. Concurrent File Copying (Limit 8)
        const limit = limitConcurrency(8);
        const photoMetadataList: any[] = [];
        let pathCopiedCount = 0;

        const copyTasks = photos.map((photo, index) =>
          limit(async () => {
            try {
              // Source Resolution Strategy (Law 05)
              // FIX: URLs in DB have /uploads/ prefix, need to strip it before joining with UPLOAD_DIR
              let sourcePath = "";
              const thumbPath = (photo.thumbnailUrl || "").replace(
                /^\/uploads\//,
                "",
              );
              const previewPath = (photo.previewUrl || "").replace(
                /^\/uploads\//,
                "",
              );
              const photoUrl = (photo.url || "").replace(/^\/uploads\//, "");

              // Priority: Preview -> Thumbnail -> Original
              if (previewPath) {
                const c = path.join(UPLOAD_DIR, previewPath);
                if (fs.existsSync(c)) sourcePath = c;
              }
              if (!sourcePath && thumbPath) {
                const c = path.join(UPLOAD_DIR, thumbPath);
                if (fs.existsSync(c)) sourcePath = c;
              }
              if (!sourcePath) {
                if (photo.url.startsWith("http")) {
                  const filename = path.basename(photo.url);
                  sourcePath = path.join(IMPORT_DIR, albumId, filename);
                  if (!fs.existsSync(sourcePath))
                    sourcePath = path.join(IMPORT_DIR, filename);
                } else {
                  sourcePath = path.join(UPLOAD_DIR, photoUrl);
                }
              }

              if (!sourcePath || !fs.existsSync(sourcePath)) {
                // Skip missing
                return;
              }

              const destFilename = path.basename(sourcePath);
              const destPath = path.join(photosDir, destFilename);

              // Async Copy
              await fs.promises.copyFile(sourcePath, destPath);
              pathCopiedCount++;

              // Add to metadata
              photoMetadataList.push({
                id: photo.id,
                url: `photos/${destFilename}`,
                title: photo.title || "",
                category: photo.category || "",
                manualEdits: photo.manualEdits || {},
                roomNumber: photo.roomNumber || "",
                faces: faceMap.get(photo.id) || [],
              });

              // Progress Update (Throttle to every 5%)
              if (
                this.wss &&
                this.wss.clients &&
                index % Math.ceil(totalPhotos / 20) === 0
              ) {
                const progress = Math.round(((index + 1) / totalPhotos) * 100);
                this.broadcastProgress(
                  albumId,
                  touchImportPath,
                  progress,
                  index + 1,
                  totalPhotos,
                );
              }
            } catch (err: any) {
              this.logger.warn(`Failed to copy photo ${photo.id}`, {
                error: err.message,
              });
            }
          }),
        );

        // Wait for all copies to complete
        await Promise.all(copyTasks);

        // Final Progress Update
        this.broadcastProgress(
          albumId,
          touchImportPath,
          100,
          totalPhotos,
          totalPhotos,
        );

        if (pathCopiedCount > 0) {
          successfulDestinations++;
          totalCopied += pathCopiedCount;

          // 5. Generate Metadata
          const albumRow = this.dbManager.get<any>(
            "SELECT * FROM albums WHERE id = ?",
            [albumId],
          );
          const metadata = {
            id: albumId,
            title: albumRow?.title || "Unknown Album",
            date: albumRow?.date || new Date().toISOString().split("T")[0],
            roomNumber: albumRow?.roomNumber || "",
            photographerId: albumRow?.photographerId,
            categories: [],
            photos: photoMetadataList,
          };

          await fs.promises.writeFile(
            path.join(albumDir, "metadata.json"),
            JSON.stringify(metadata, null, 2),
          );
        }
      } catch (destError: any) {
        errors.push(
          `Failed to send to ${touchImportPath}: ${destError.message}`,
        );
      }
    }

    if (successfulDestinations === 0 && destinations.size > 0) {
      throw new Error(
        `Failed to send album to any kiosk. Errors: ${errors.join("; ")}`,
      );
    }

    return {
      success: true,
      copiedCount: totalCopied,
      destinations: Array.from(destinations),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private broadcastProgress(
    albumId: string,
    destination: string,
    progress: number,
    current: number,
    total: number,
  ) {
    if (!this.wss || !this.wss.clients) return;

    this.wss.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            type: "KIOSK_SEND_PROGRESS",
            payload: { albumId, destination, progress, current, total },
          }),
        );
      }
    });
  }
}
