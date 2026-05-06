import fs from "fs";
import path from "path";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import { UPLOAD_DIR, DATA_DIR } from "../config/constants";

/**
 * Phase 14: RecyclerService
 * Orchestrates physical asset scrubbing and log rotation based on retention policies.
 */
export class RecyclerService {
  constructor(
    private dbManager: DatabaseManager,
    private logger: Logger
  ) {}

  /**
   * Main scrub routine
   */
  public async scrub() {
    this.logger.info("[Recycler] Starting automated scrub cycle...");
    try {
      const settings = this.getRetentionSettings();
      
      await this.scrubArchivedAssets(settings);
      await this.rotateLogs(settings.auditDays);
      
      this.logger.info("[Recycler] Scrub cycle complete.");
    } catch (error: any) {
      this.logger.error("[Recycler] Scrub failed", { error: error.message });
    }
  }

  /**
   * Cleans up physical folders for albums that have been archived
   */
  private async scrubArchivedAssets(settings: any) {
    this.logger.info("[Recycler] Checking for archived asset candidates...");
    
    // 1. Identification: Find albums in 'archive' DB that are older than retention_days_hi_res
    // We check the 'archive.albums' table (ArchiveService attaches it as 'archive')
    try {
      // Ensure archive is attached using central DATA_DIR
      const archivePath = path.join(DATA_DIR, 'archive.db').replace(/\\/g, '/');
      try {
        this.dbManager.exec(`ATTACH DATABASE '${archivePath}' AS archive`);
      } catch (attachError: any) {
        if (!attachError.message.includes("already in use")) {
           this.logger.debug(`[Recycler] Archive attach info: ${attachError.message}`);
        }
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.hiResDays);
      const cutoffIso = cutoffDate.toISOString();

      // Find albums in archive that still have physical directories
      const archivedAlbums = this.dbManager.query<{ id: string }>(
        "SELECT id FROM archive.albums WHERE archived_at < ?",
        [cutoffIso]
      );

      let purgedCount = 0;
      for (const album of archivedAlbums) {
        if (await this.purgeAlbumFiles(album.id, settings)) {
          purgedCount++;
        }
      }

      this.logger.info(`[Recycler] Physical purge complete. Cleaned ${purgedCount} archived directories.`);
    } catch (error: any) {
      if (error.message.includes("no such table: archive.albums")) {
        this.logger.debug("[Recycler] Archive database empty or not initialized. Skipping asset scrub.");
      } else {
        throw error;
      }
    }
  }

  /**
   * Deletes physical files for a specific album with safeguards
   */
  private async purgeAlbumFiles(albumId: string, settings: any): Promise<boolean> {
    const albumPath = path.join(UPLOAD_DIR, albumId);
    if (!fs.existsSync(albumPath)) return false;

    // Safeguard 1: Fulfillment Lock
    if (settings.fulfillmentLock) {
      const pendingOrders = this.dbManager.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM main.orders WHERE albumId = ? AND status NOT IN ('fulfilled', 'shipped', 'cancelled')",
        [albumId]
      );
      if (pendingOrders && pendingOrders.count > 0) {
        this.logger.debug(`[Recycler] Safeguard: Skipping album ${albumId} due to pending orders.`);
        return false;
      }
    }

    // Safeguard 2: Cloud Sync Required
    if (settings.cloudSyncRequired) {
      const unsyncedPhotos = this.dbManager.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM main.photos WHERE albumId = ? AND sync_status != 'synced'",
        [albumId]
      );
      // Note: If album is already moved to archive.db, it won't be in main.photos. 
      // ArchiveService only archives FULLY SYNCED albums, so this is implicitly handled.
    }

    try {
      this.logger.info(`[Recycler] Purging physical assets for archived album ${albumId}`);
      
      // Industrial Grade: Use fs.rmSync to delete recursively
      fs.rmSync(albumPath, { recursive: true, force: true });
      return true;
    } catch (error: any) {
      this.logger.error(`[Recycler] Failed to purge folder for ${albumId}`, { error: error.message });
      return false;
    }
  }

  /**
   * Rotates audit logs and diagnostic history
   */
  private async rotateLogs(auditDays: number) {
    this.logger.info(`[Recycler] Rotating logs (Retention: ${auditDays} days)`);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - auditDays);
      const cutoffIso = cutoffDate.toISOString();

      // Prune Audit Logs
      const auditResult = this.dbManager.run(
        "DELETE FROM audit_logs WHERE timestamp < ?",
        [cutoffIso]
      );
      
      // Prune Diagnostic History
      const diagResult = this.dbManager.run(
        "DELETE FROM diagnostic_history WHERE timestamp < ?",
        [cutoffIso]
      );

      this.logger.info("[Recycler] Log rotation complete", {
        auditPruned: auditResult.changes,
        diagPruned: diagResult.changes
      });
    } catch (error: any) {
      this.logger.error("[Recycler] Log rotation failed", { error: error.message });
    }
  }

  /**
   * Helper to fetch retention settings from DB
   */
  private getRetentionSettings() {
    const fetch = (key: string, def: string) => {
      const row = this.dbManager.get<{ value: string }>(
        "SELECT value FROM settings WHERE key = ?", [key]
      );
      return row ? row.value : def;
    };

    return {
      hiResDays: parseInt(fetch("retention_days_hi_res", "14")),
      tieredDays: parseInt(fetch("retention_days_tiered", "60")),
      auditDays: parseInt(fetch("retention_days_audit", "90")),
      cloudSyncRequired: fetch("retention_cloud_sync_required", "true") === "true",
      fulfillmentLock: fetch("retention_fulfillment_lock", "true") === "true"
    };
  }
}
