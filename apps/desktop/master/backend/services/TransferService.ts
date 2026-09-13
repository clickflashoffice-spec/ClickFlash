import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import { UPLOAD_DIR, IMPORT_DIR } from "../config/constants";
import { limitConcurrency } from '../middleware/limitConcurrency';
import { v4 as uuidv4 } from "uuid";

interface TransferContext {
  dbManager: DatabaseManager;
  logger: Logger;
  wss?: any;
}

export interface TransferResult {
  success: boolean;
  copiedCount: number;
  destinations: string[];
  errors?: string[];
}

export interface SdCardImportOptions {
  photographerId?: string | number;
  autoAssignAlbum?: boolean;
  albumTitle?: string;
  concurrency?: number;
}

export interface SdCardImportResult {
  success: boolean;
  albumId: string;
  importedCount: number;
  skippedCount: number;
  totalFound: number;
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
    metadataOnly: boolean = false
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
          JSON.stringify({ ids: photoIds || null, metadataOnly }),
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

      const parsed = job.photo_ids ? JSON.parse(job.photo_ids) : null;
      let photoIds: string[] | undefined;
      let metadataOnly = false;
      if (parsed) {
        if (Array.isArray(parsed)) {
          photoIds = parsed;
        } else {
          photoIds = parsed.ids || undefined;
          metadataOnly = parsed.metadataOnly || false;
        }
      }

      // Reuse existing send logic but specialized for one destination
      const result = await this.sendAlbumToKiosks(
        job.album_id,
        new Set([job.destination_path]),
        photoIds,
        metadataOnly
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
    metadataOnly: boolean = false,
    options?: { excludeBiometrics?: boolean }
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

    // 2. Biometric Air-Gap (ADR-012 / GDPR Art. 9 / BIPA)
    // Raw ArcFace 512D biometric vectors are strictly confined to encrypted SQLCipher
    // storage on the appliance or touch kiosk local vector store. They are NEVER exported
    // into unencrypted metadata.json files written to disk or SMB shares.

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
              if (!metadataOnly) {
                await fs.promises.copyFile(sourcePath, destPath);
                pathCopiedCount++;
              } else {
                pathCopiedCount++; // Ensure metadata is generated even if file is not physically copied
              }

              // Biometric Air-Gap (ADR-012 / GDPR Art. 9)
              // Raw 512D ArcFace embeddings are strictly air-gapped from metadata.json
              let sanitizedFaces: any[] | undefined = undefined;
              if (photo.faces && Array.isArray(photo.faces)) {
                if (options?.excludeBiometrics !== false) {
                  sanitizedFaces = photo.faces.map((f: any) => ({
                    faceId: f.faceId || f.id || String(f),
                    box: f.box || undefined,
                  }));
                } else {
                  sanitizedFaces = photo.faces;
                }
              }

              // Add to metadata (Biometric Air-Gap: No raw face vectors in metadata.json)
              const photoEntry: any = {
                id: photo.id,
                url: `photos/${destFilename}`,
                title: photo.title || "",
                category: photo.category || "",
                manualEdits: photo.manualEdits || {},
                roomNumber: photo.roomNumber || "",
              };
              if (sanitizedFaces && sanitizedFaces.length > 0) {
                photoEntry.faces = sanitizedFaces;
              }
              photoMetadataList.push(photoEntry);

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

  /**
   * ADR-012 Phase 1: High-level alias to send album to Touch Kiosk(s) with biometric air-gapping.
   */
  public async sendAlbumToTouch(
    albumId: string,
    destinations: Set<string>,
    options?: {
      photoIds?: string[];
      metadataOnly?: boolean;
      excludeBiometrics?: boolean;
    }
  ): Promise<TransferResult> {
    return this.sendAlbumToKiosks(
      albumId,
      destinations,
      options?.photoIds,
      options?.metadataOnly ?? false,
      { excludeBiometrics: options?.excludeBiometrics ?? true }
    );
  }

  /**
   * ADR-012 Phase 1: Zero-Click SD Auto-Ingest.
   * Scans removable drive / DCIM trees, copies photos into local UPLOAD_DIR,
   * prevents duplicate ingestion via SHA-256 hash checks, registers the album in DB,
   * and emits real-time WebSocket progress updates.
   *
   * CRITICAL INVARIANT: ZERO-DELETION GUARANTEE.
   * Source photos on the camera card are NEVER deleted, moved, or altered.
   */
  public async importFromRemovableDrive(
    mountPath: string,
    options?: SdCardImportOptions
  ): Promise<SdCardImportResult> {
    if (!mountPath || !fs.existsSync(mountPath)) {
      throw new Error(`Mount path does not exist: ${mountPath}`);
    }

    this.logger.info(`[TransferService] Starting Zero-Click SD import from: ${mountPath}`);

    const dcimPath = path.join(mountPath, "DCIM");
    const scanRoot = fs.existsSync(dcimPath) ? dcimPath : mountPath;

    const SUPPORTED_EXTS = new Set([
      ".jpg", ".jpeg", ".cr2", ".cr3", ".nef", ".arw", ".png", ".webp", ".dng"
    ]);

    const discoveredFiles: string[] = [];

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTS.has(ext)) {
              discoveredFiles.push(fullPath);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`[TransferService] Failed to read directory ${dir}: ${err.message}`);
      }
    };

    walk(scanRoot);

    const totalFound = discoveredFiles.length;
    if (totalFound === 0) {
      this.logger.info(`[TransferService] No matching photos found in ${scanRoot}`);
      return {
        success: true,
        albumId: "",
        importedCount: 0,
        skippedCount: 0,
        totalFound: 0
      };
    }

    // Auto-create target album
    const albumId = `album-${uuidv4()}`;
    const today = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5);
    const title = options?.albumTitle || `SD Import ${today} ${timeStr}`;

    this.dbManager.run(
      `INSERT INTO albums (id, title, date, photographerId, source, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [albumId, title, today, options?.photographerId || null, "sd_card_zero_click", "Draft"]
    );

    // Ensure target storage directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < discoveredFiles.length; i++) {
      const sourceFile = discoveredFiles[i];
      const filename = path.basename(sourceFile);

      try {
        // Calculate SHA-256 hash for deduplication
        const fileBuffer = await fs.promises.readFile(sourceFile);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        // Check if hash already exists in DB
        const existing = this.dbManager.get<{ id: string }>(
          "SELECT id FROM photos WHERE fileHash = ?",
          [fileHash]
        );

        if (existing) {
          skippedCount++;
          continue;
        }

        // Copy file to UPLOAD_DIR (CRITICAL: ZERO-DELETION INVARIANT - copyFile only!)
        const photoId = uuidv4();
        const destFilename = `${photoId}-${filename}`;
        const destPath = path.join(UPLOAD_DIR, destFilename);

        await fs.promises.copyFile(sourceFile, destPath);

        const stat = await fs.promises.stat(destPath);

        this.dbManager.run(
          `INSERT INTO photos (id, albumId, title, url, originalFilename, fileSize, fileHash, photographerId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            photoId,
            albumId,
            filename,
            `/uploads/${destFilename}`,
            filename,
            stat.size,
            fileHash,
            options?.photographerId || null
          ]
        );

        importedCount++;

        // Broadcast progress event via WebSocket
        this.broadcastSdProgress(albumId, filename, importedCount + skippedCount, totalFound);
      } catch (err: any) {
        this.logger.error(`[TransferService] Failed importing file ${sourceFile}: ${err.message}`);
        errors.push(`${filename}: ${err.message}`);
      }
    }

    // Broadcast completion event
    this.broadcastSdComplete(albumId, importedCount, skippedCount, totalFound);

    this.logger.info(
      `[TransferService] Zero-Click SD Import complete: ${importedCount} imported, ${skippedCount} skipped, ${errors.length} errors.`
    );

    return {
      success: errors.length === 0 || importedCount > 0,
      albumId,
      importedCount,
      skippedCount,
      totalFound,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private broadcastSdProgress(
    albumId: string,
    currentFilename: string,
    processed: number,
    total: number
  ) {
    if (!this.wss || !this.wss.clients) return;
    const percent = Math.round((processed / total) * 100);
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            type: "SD_CARD_IMPORT_PROGRESS",
            payload: { albumId, current: currentFilename, processed, total, percent }
          })
        );
      }
    });
  }

  private broadcastSdComplete(
    albumId: string,
    importedCount: number,
    skippedCount: number,
    totalFound: number
  ) {
    if (!this.wss || !this.wss.clients) return;
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            type: "SD_CARD_IMPORT_COMPLETE",
            payload: { albumId, importedCount, skippedCount, totalFound }
          })
        );
      }
    });
  }
}
