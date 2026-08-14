// backend/services/maintenanceService.ts
import fs from "fs";
import path from "path";
import DatabaseManager from '../database/db';
import { Logger } from '../utils/logger';
import { ArchiveService } from "./ArchiveService";
import { BACKUP_DIR, UPLOAD_DIR } from "../config/constants";
import { runOrphanScan, ensureOrphanAuditSchema } from '../services/orphanScanner';

/**
 * MaintenanceService - Rules 19, 20, 21
 * Handles daily optimization, backups, and off-load archival for high-volume libraries.
 */
export default class MaintenanceService {
  private dbManager: DatabaseManager;
  private logger: Logger;
  private intervalParams: any;

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
    this.intervalParams = {
      diskCheckInterval: 5 * 60 * 1000, // 5 minutes
      backupInterval: 60 * 60 * 1000, // Hourly check
      vacuumInterval: 24 * 60 * 60 * 1000, // Daily check
      archivalInterval: 24 * 60 * 60 * 1000, // Daily archival
      checkpointInterval: 4 * 60 * 60 * 1000, // 4 hours
      previewRepairInterval: 10 * 60 * 1000, // 10 minutes
      orphanScanInterval: 6 * 60 * 60 * 1000, // 6 hours (P0-1 fix)
    };
  }

  public start() {
    this.logger.info("[Maintenance] Service started");

    // Initial Checks
    this.checkDiskSpace();

    // Intervals
    setInterval(
      () => this.checkDiskSpace(),
      this.intervalParams.diskCheckInterval,
    );
    setInterval(
      () => this.scheduleBackup(),
      this.intervalParams.backupInterval,
    );
    setInterval(
      () => this.archiveOldOrders(),
      this.intervalParams.archivalInterval,
    );
    setInterval(
      () => this.scheduleVacuum(),
      this.intervalParams.vacuumInterval,
    );
    setInterval(
      () => this.performCheckpoint(),
      this.intervalParams.checkpointInterval,
    );
    setInterval(
      () => this.repairAlbumPreviews(),
      this.intervalParams.previewRepairInterval,
    );

    // P0-1: Orphan file scanner — every 6 hours
    setInterval(
      () => this.runOrphanScanSafe(),
      this.intervalParams.orphanScanInterval,
    );

    // Initial runs
    setTimeout(() => this.repairAlbumPreviews(), 30 * 1000);
    setTimeout(() => this.runOrphanScanSafe(), 60 * 1000); // 1 minute after boot
  }

  /**
   * P0-1 fix: Run the bidirectional orphan scanner. Wrapped in try/catch
   * so a scan failure cannot kill the maintenance interval loop.
   */
  private async runOrphanScanSafe(): Promise<void> {
    try {
      ensureOrphanAuditSchema(this.dbManager);
      const report = await runOrphanScan(this.dbManager, this.logger);
      if (report.dbToFs.missingHighres > 0) {
        this.logger.warn(
          `[Maintenance] Orphan scan flagged ${report.dbToFs.missingHighres} photo(s) with missing high-res on disk. ` +
          `View with: SELECT * FROM orphan_audit WHERE scan_id='${report.scanId}'`,
        );
      }
    } catch (err: any) {
      this.logger.error("[Maintenance] Orphan scan failed", { error: err.message });
    }
  }

  // Rule 21: Drive-Space Sentinel
  private async checkDiskSpace() {
    try {
      const drive = path.parse(process.cwd()).root.replace("\\", "");
      const { spawn } = require("child_process");

      await new Promise<void>((resolve) => {
        const child = spawn("wmic", [
          "logicaldisk",
          "where",
          `Caption = "${drive}"`,
          "get",
          "FreeSpace,Size",
          "/Value",
        ]);
        let stdout = "";

        child.stdout.on("data", (d: any) => (stdout += d.toString()));
        child.on("close", () => {
          const freeMatch = stdout.match(/FreeSpace=(\d+)/);
          const sizeMatch = stdout.match(/Size=(\d+)/);

          if (freeMatch && sizeMatch) {
            const free = parseInt(freeMatch[1]);
            const size = parseInt(sizeMatch[1]);
            const usedPercent = ((size - free) / size) * 100;

            if (usedPercent > 90) {
              this.logger.warn(
                `[DriveSentinel] CRITICAL: Disk usage at ${usedPercent.toFixed(1)}%`,
              );
              this.autoPrune(usedPercent);
            }
          }
          resolve();
        });
        child.on("error", (err: any) => {
          this.logger.warn("[DriveSentinel] Check failed", {
            error: err.message,
          });
          resolve();
        });
      });
    } catch (error: any) {
      this.logger.warn("[DriveSentinel] Check failed", {
        error: error.message,
      });
    }
  }

  // Rule 19: Multi-Layered Backup
  private async scheduleBackup() {
    const date = new Date().toISOString().split("T")[0];
    const backupFile = path.join(BACKUP_DIR, `backup-${date}.db`);

    if (!fs.existsSync(backupFile)) {
      await this.performBackup(backupFile);
    }
  }

  private async performBackup(destPath: string) {
    this.logger.info("[Backup] Starting database backup...");
    try {
      this.dbManager.exec(`VACUUM INTO '${destPath}'`);
      this.logger.info("[Backup] Database backup complete", { path: destPath });
    } catch (error: any) {
      this.logger.error("[Backup] Failed", { error: error.message });
    }
  }

  // Phase 21: Storage Archiving & Database Pruning
  private async archiveOldOrders() {
    this.logger.info("[Maintenance] Starting Periodic Archival check...");
    try {
      await ArchiveService.checkAndArchiveSyncCandidates(
        this.dbManager,
        this.logger,
      );
    } catch (error: any) {
      this.logger.error("[Maintenance] Archival check failed", {
        error: error.message,
      });
    }
  }

  // Rule 20: DB Maintenance (VACUUM)
  private async scheduleVacuum() {
    const day = new Date().getDay(); // 0 = Sunday
    if (day === 0) {
      const lastRun = await this.getLastVacuumDate();
      const today = new Date().toISOString().split("T")[0];

      if (lastRun !== today) {
        this.performVacuum();
        this.setLastVacuumDate(today);
      }
    }
  }

  private performVacuum() {
    this.logger.info("[Maintenance] Running VACUUM...");
    try {
      this.dbManager.exec("VACUUM");
      this.logger.info("[Maintenance] VACUUM complete");

      this.dbManager.exec("ANALYZE");
      this.logger.info("[Maintenance] ANALYZE complete (post-VACUUM)");
    } catch (error: any) {
      this.logger.error("[Maintenance] VACUUM/ANALYZE failed", {
        error: error.message,
      });
    }
  }

  private async getLastVacuumDate(): Promise<string> {
    try {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'last_vacuum'",
      );
      return row ? row.value : "";
    } catch (e) {
      return "";
    }
  }

  private async setLastVacuumDate(date: string) {
    try {
      this.dbManager.run(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('last_vacuum', ?, ?)",
        [date, new Date().toISOString()],
      );
    } catch (e) {
      this.logger.warn("[Maintenance] Failed to set last vacuum date:", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private performCheckpoint() {
    this.logger.info("[Maintenance] Performing WAL Checkpoint...");
    try {
      this.dbManager.exec("PRAGMA wal_checkpoint(RESTART)");
      this.logger.info("[Maintenance] WAL Checkpoint complete");
    } catch (error: any) {
      this.logger.error("[Maintenance] Checkpoint failed", {
        error: error.message,
      });
    }
  }

  private async autoPrune(usedPercent: number) {
    this.logger.info(
      `[Maintenance] Starting Auto-Prune (Disk: ${usedPercent.toFixed(1)}%)`,
    );
    try {
      const now = Date.now();
      const retentionMs = 7 * 24 * 60 * 60 * 1000;
      let prunedCount = 0;

      const processDirectory = (dir: string) => {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            processDirectory(fullPath);
            try {
              if (fs.readdirSync(fullPath).length === 0) {
                fs.rmdirSync(fullPath);
              }
            } catch (e) {}
          } else if (
            (item.includes("_preview") ||
              item.includes("_tiny") ||
              item.includes("_thumb")) &&
            now - stats.mtimeMs > retentionMs
          ) {
            try {
              fs.unlinkSync(fullPath);
              prunedCount++;
            } catch (e: any) {
              this.logger.warn(`[Maintenance] Failed to prune ${item}`, {
                error: e.message,
              });
            }
          }
        }
      };

      processDirectory(UPLOAD_DIR);
      this.logger.info(
        `[Maintenance] Auto-Prune complete. Removed ${prunedCount} tiered assets.`,
      );
    } catch (error: any) {}
  }

  private async repairAlbumPreviews() {
    this.logger.info("[Maintenance] Running Album Preview Repair...");
    try {
      // Find albums with NULL or empty coverPhotoUrl
      const albumsWithoutCover = this.dbManager.query<{ id: string }>(
        "SELECT id FROM albums WHERE coverPhotoUrl IS NULL OR coverPhotoUrl = ''",
      );

      if (albumsWithoutCover.length > 0) {
        this.logger.info(
          `[Maintenance] Found ${albumsWithoutCover.length} albums missing previews.`,
        );

        for (const album of albumsWithoutCover) {
          // Find the latest photo for this album (or any photo)
          const photo = this.dbManager.get<{
            thumbnailUrl: string;
            previewUrl: string;
            url: string;
          }>(
            "SELECT thumbnailUrl, previewUrl, url FROM photos WHERE albumId = ? LIMIT 1",
            [album.id],
          );

          if (photo) {
            const coverUrl =
              photo.thumbnailUrl || photo.previewUrl || photo.url;
            this.dbManager.run(
              "UPDATE albums SET coverPhotoUrl = ?, updated_at = ? WHERE id = ?",
              [coverUrl, new Date().toISOString(), album.id],
            );
            this.logger.info(
              `[Maintenance] Repaired preview for album ${album.id}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.error("[Maintenance] Album Preview Repair failed", {
        error: error.message,
      });
    }
  }
}
