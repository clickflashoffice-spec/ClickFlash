// backend/services/folderMonitor.ts
// Folder Monitor Service - Refactored for Phase 130 (Performance)

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Worker } from "worker_threads";
import { IMPORT_DIR } from "../config/constants";
import DatabaseManager from '../database/db';
import { Logger } from '../utils/logger';
import RealtimeService from "./realtimeService";
import AlbumService from "./albumService";
import { PhotoProcessor } from '../services/photoProcessor';

interface FolderMonitorContext {
  dbManager: DatabaseManager;
  logger: Logger;
  photoProcessor: PhotoProcessor;
  realtimeService: RealtimeService;
  wss: import("ws").WebSocketServer;
  bookingService?: import("./bookingService").BookingService;
}

const startFolderMonitor = (context: FolderMonitorContext): void => {
  const { dbManager, logger, photoProcessor, bookingService } = context;
  const albumService = new AlbumService({ ...context, bookingService });

  // For development (src/backend/services -> src/backend/workers)
  const devWorkerPath = path.resolve(__dirname, "../workers/folderWorker.ts");
  // For production (dist/backend/server.js -> dist/backend/workers/)
  const prodWorkerPath = path.resolve(__dirname, "./workers/folderWorker.js");
  const actualWorkerPath = fs.existsSync(prodWorkerPath) ? prodWorkerPath : devWorkerPath;

  // Configuration for worker
  const getPaths = () => {
    const settingsRow = dbManager.get<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'masterImportPath'",
    );
    let masterImportPath = "";
    if (settingsRow) {
      try {
        const parsed = JSON.parse(settingsRow.value);
        masterImportPath = parsed.path || parsed;
      } catch { masterImportPath = settingsRow.value; }
    }

    let touchExportPath = "";
    try {
      const networkSettingsRow = dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'network_settings'",
      );
      if (networkSettingsRow && networkSettingsRow.value) {
        const netSettings = JSON.parse(networkSettingsRow.value);
        if (netSettings.touchSharedImportFolder) {
          touchExportPath = netSettings.touchSharedImportFolder;
        }
      }
    } catch { /* ignore */ }

    return {
      masterImportPath,
      touchExportPath,
      kioskSyncFolder: process.env.KIOSK_SYNC_FOLDER || "",
    };
  };

  const startWorker = () => {
    const worker = new Worker(actualWorkerPath, {
      workerData: getPaths()
    });

    worker.on("message", async (msg) => {
      if (msg.type === "FOUND_FILES") {
        const { albumId, albumPath, files, roomNumber } = msg;

        // 1. Ensure Album Exists
        try {
          albumService.createAlbum({
            id: albumId,
            title: `Imported Album ${albumId.substring(0, 8)}`,
            status: "active",
          });
        } catch {}

        // 2. Filter existing records in one batch to reduce DB hits
        const newFiles = files.filter((fileName: string) => {
          const exists = dbManager.get(
            "SELECT id FROM photos WHERE albumId = ? AND originalFilename = ?",
            [albumId, fileName]
          );
          return !exists;
        });

        if (newFiles.length === 0) return;

        // 3. Process new files in batches
        const batchSize = 10;
        for (let i = 0; i < newFiles.length; i += batchSize) {
          const chunk = newFiles.slice(i, i + batchSize);
          const processedResults: any[] = [];
          const tempDir = path.join(IMPORT_DIR, "temp");
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

          await Promise.all(
            chunk.map(async (fileName: string) => {
              const itemPath = path.join(albumPath, fileName);
              const photoId = crypto.randomUUID();
              const tempPath = path.join(tempDir, `${photoId}_${fileName}`);

              try {
                await fs.promises.copyFile(itemPath, tempPath);
                const processed = await photoProcessor.processPhoto(
                  { filepath: tempPath, originalFilename: fileName },
                  albumId,
                  photoId
                );

                processedResults.push({
                  id: photoId,
                  albumId,
                  url: processed.url,
                  tinyUrl: processed.tinyUrl,
                  thumbnailUrl: processed.thumbnailUrl,
                  previewUrl: processed.previewUrl,
                  originalFilename: fileName,
                  fileSize: processed.fileSize,
                  mimeType: processed.mimeType,
                  width: processed.width,
                  height: processed.height,
                  fileHash: processed.fileHash,
                  roomNumber,
                  quality_flags: JSON.stringify(processed.qualityFlags || []),
                  sourcePath: itemPath,
                });
              } catch (err: any) {
                logger.error(`[Import] Failed processing ${fileName}: ${err.message}`);
                try { 
                  if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath); 
                } catch (unlinkErr) { 
                  /* ignore cleanup errors */ 
                }
              }
            })
          );

          if (processedResults.length > 0) {
            try {
              albumService.registerPhotosBatch(processedResults);
              // Bulk cleanup source files
              await Promise.allSettled(processedResults.map(p => fs.promises.unlink(p.sourcePath)));
            } catch (dbErr: any) {
              logger.error(`[Import] Batch DB registration failed: ${dbErr.message}`);
            }
          }
          await new Promise(resolve => setImmediate(resolve));
        }
      } else if (msg.type === "ERROR") {
        logger.error(`[FolderWorker] Worker error: ${msg.error}`);
      }
    });

    // Guard: error event always precedes exit on crash — use a flag so we
    // only schedule one restart regardless of which events fire.
    let restarting = false;
    const scheduleRestart = (reason: string) => {
      if (restarting) return;
      restarting = true;
      logger.warn(`[FolderWorker] ${reason} — restarting in 5s`);
      setTimeout(startWorker, 5000);
    };

    worker.on("error", (err) => {
      logger.error("[FolderWorker] Critical worker error", { error: err.message });
      scheduleRestart(`Worker error: ${err.message}`);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        scheduleRestart(`Worker exited with code ${code}`);
      }
    });

    return worker;
  };

  startWorker();
  logger.info("[Watcher] Background folder monitor started via Worker Threads");
};

export default startFolderMonitor;
