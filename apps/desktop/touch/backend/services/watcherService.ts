// backend/services/watcherService.ts
import chokidar, { FSWatcher } from "chokidar";
import path from "path";
import fs from "fs";
import { DatabaseManager } from "../shared/db";
import { AlbumService } from "./albumService";
import { VectorIndexService } from "./VectorIndexService";
import { faceService } from "./faceService";
import { v4 as uuidv4 } from "uuid";
import { Logger } from "../shared/logger";

/** Minimal broadcast interface — avoids circular dep with RealtimeService */
interface BroadcastService {
  broadcast(payload: {
    action: string;
    collection: string;
    record: Record<string, unknown>;
  }): void;
}

interface AlbumMetadata {
  id: string;
  title: string;
  date?: string;
  roomNumber?: string;
  photographerId?: number | string;
  categories?: string[];
  photos?: PhotoMetadata[];
  [key: string]: any;
}

interface PhotoMetadata {
  id: string;
  url: string;
  title?: string;
  category?: string;
  roomNumber?: string;
  manualEdits?: any;
}

/**
 * Watcher Service (Titan Protocol)
 * Real-time monitoring of uploads folder using chokidar.
 * Consolidates import logic for zero-latency and zero-bloat.
 */
export class WatcherService {
  private dbManager: DatabaseManager;
  private albumService: AlbumService;
  private vectorIndex: VectorIndexService;
  private logger: Logger;
  private uploadDir: string;
  private realtimeService: BroadcastService | undefined;
  private watcher: FSWatcher | null = null;
  public isReady: boolean = false;
  private processingQueue: Promise<void> = Promise.resolve();

  constructor(
    dbManager: DatabaseManager,
    albumService: AlbumService,
    vectorIndex: VectorIndexService,
    uploadDir: string,
    logger: Logger,
    realtimeService?: BroadcastService,
  ) {
    this.dbManager = dbManager;
    this.albumService = albumService;
    this.vectorIndex = vectorIndex;
    this.uploadDir = uploadDir;
    this.logger = logger;
    this.realtimeService = realtimeService;
  }

  public start(): void {
    if (this.watcher) {
      this.logger.warn("[Watcher] Already running");
      return;
    }

    this.logger.info(
      `[Watcher] Starting Titan Real-time monitor on: ${this.uploadDir}`,
    );

    this.watcher = chokidar.watch(this.uploadDir, {
      ignored: [/(^|[\/\\])\../, /\.processed$/, "**/temp/**"],
      persistent: true,
      ignoreInitial: false,
      depth: 1,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 },
    });

    this.watcher
      .on("addDir", (dirPath: string) => this.handleFolderCheck(dirPath))
      .on("add", (filePath: string) => this.handleFileCheck(filePath))
      .on("ready", () => {
        this.isReady = true;
        this.logger.info("[Watcher] Initial scan complete.");
      })
      .on("error", (error: unknown) =>
        this.logger.error(
          `[Watcher] Error: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  }

  public stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.logger.info("[Watcher] Stopped");
    }
  }

  private handleFolderCheck(dirPath: string): void {
    this.processingQueue = this.processingQueue
      .then(async () => {
        const folderName = path.basename(dirPath);
        if (
          !folderName.startsWith("album-") ||
          folderName.endsWith(".processed")
        )
          return;
        const metadataPath = path.join(dirPath, "metadata.json");
        if (!fs.existsSync(metadataPath)) return;
        await this.triggerImport(dirPath);
      })
      .catch((err) =>
        this.logger.error(`[Watcher] Folder check error: ${err.message}`),
      );
  }

  private handleFileCheck(filePath: string): void {
    this.processingQueue = this.processingQueue
      .then(async () => {
        if (path.basename(filePath) === "metadata.json") {
          const dirPath = path.dirname(filePath);
          const folderName = path.basename(dirPath);
          if (
            folderName.startsWith("album-") &&
            !folderName.endsWith(".processed")
          ) {
            await this.triggerImport(dirPath);
          }
        }
      })
      .catch((err) =>
        this.logger.error(`[Watcher] File check error: ${err.message}`),
      );
  }

  private async triggerImport(folderPath: string): Promise<void> {
    try {
      const metadataPath = path.join(folderPath, "metadata.json");
      if (!fs.existsSync(metadataPath)) return;

      const metadata: AlbumMetadata = JSON.parse(
        fs.readFileSync(metadataPath, "utf8"),
      );
      const now = new Date().toISOString();

      // Create Album
      this.albumService.createAlbum({
        id: metadata.id,
        title: metadata.title,
        date: metadata.date || now.split("T")[0],
        roomNumber: metadata.roomNumber || "",
        photographerId: metadata.photographerId,
        categories: metadata.categories || [],
        source: "master",
      });

      // Import Photos
      const photosFolder = path.join(folderPath, "photos");
      if (metadata.photos && Array.isArray(metadata.photos)) {
        for (const photo of metadata.photos) {
          const filename = photo.url.split("/").pop() || "";
          const relativePhotoPath = path
            .join(path.basename(folderPath), "photos", filename)
            .split(path.sep)
            .join("/");

          this.dbManager.run(
            `INSERT OR IGNORE INTO photos (id, albumId, title, url, category, roomNumber, manualEdits, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              photo.id,
              metadata.id,
              photo.title || "",
              relativePhotoPath,
              photo.category || "",
              photo.roomNumber || metadata.roomNumber || "",
              JSON.stringify(photo.manualEdits || {}),
              now,
            ],
          );

          // --- Face Indexing (Titan Protocol Integration) ---
          try {
            const fullPhotoPath = path.join(this.uploadDir, relativePhotoPath);
            const analysis = await faceService
              .getInstance(this.logger)
              .analyzeImage(fullPhotoPath);

            for (const face of analysis.faces) {
              const faceId = "face-" + uuidv4();
              const descriptorJson = JSON.stringify(
                Array.from(face.descriptor),
              );

              this.dbManager.run(
                "INSERT INTO photo_faces (id, photoId, descriptor, box, createdAt) VALUES (?, ?, ?, ?, ?)",
                [
                  faceId,
                  photo.id,
                  descriptorJson,
                  JSON.stringify(face.box),
                  now,
                ],
              );

              this.vectorIndex.addFace(photo.id, faceId, face.descriptor);
            }

            if (analysis.faceCount > 0) {
              this.logger.info(
                `[Watcher] Indexed ${analysis.faceCount} faces for photo ${photo.id}`,
              );
            }
          } catch (faceErr: unknown) {
            this.logger.warn(
              `[Watcher] Face indexing failed for photo ${photo.id}: ${faceErr instanceof Error ? faceErr.message : String(faceErr)}`,
            );
          }
        }
      }

      // Broadcast
      if (this.realtimeService?.broadcast) {
        this.realtimeService.broadcast({
          action: "create",
          collection: "albums",
          record: {
            ...metadata,
            kiosk_ready: 1,
            created_at: now,
            updated_at: now,
          },
        });
      }

      this.logger.info(`[Watcher] Successfully imported album: ${metadata.id}`);
    } catch (err: unknown) {
      this.logger.error(
        `[Watcher] Import failed for ${folderPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export default WatcherService;
