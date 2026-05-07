/**
 * BackupService — server-side backup / restore for ClickFlash Master OS.
 *
 * Export: streams a .clickflash-backup (zip) containing:
 *   - manifest.json  (version, timestamp, app version)
 *   - master.db      (SQLite database snapshot)
 *   - uploads/       (all uploaded photos, flat copy)
 *
 * Restore: accepts the same zip, validates manifest, then replaces DB and
 * uploads in-place. The server MUST be restarted after a successful restore so
 * the new DB is picked up cleanly.
 *
 * Security note: restore is an admin-only operation. The route layer enforces
 * authentication before calling this service.
 */

import fs from "fs";
import path from "path";
import os from "os";
import archiver from "archiver";
import AdmZip from "adm-zip";
import { Logger } from "../shared/logger";

export interface BackupManifest {
  version: number;       // schema version for future migration support
  appVersion: string;    // package.json version at backup time
  createdAt: string;     // ISO timestamp
  platform: string;
  hostname: string;
}

const BACKUP_SCHEMA_VERSION = 1;
const APP_VERSION = process.env.npm_package_version || "4.2.0";

export class BackupService {
  constructor(
    private readonly dbPath: string,
    private readonly uploadsDir: string,
    private readonly logger: Logger,
  ) {}

  /**
   * Stream a complete backup archive to the given writable stream.
   * Caller is responsible for setting response headers before piping.
   */
  async streamExport(destination: NodeJS.WritableStream): Promise<void> {
    const manifest: BackupManifest = {
      version: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      platform: process.platform,
      hostname: os.hostname(),
    };

    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("warning", (err: Error & { code?: string }) => {
      if (err.code === "ENOENT") {
        this.logger.warn("[BackupService] Archive warning (ENOENT)", { message: err.message });
      } else {
        throw err;
      }
    });

    archive.pipe(destination);

    // 1. Manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

    // 2. SQLite database — copy to a temp file first so SQLite isn't locked
    //    mid-stream (WAL mode checkpoint may still be in progress otherwise).
    const tempDb = path.join(os.tmpdir(), `clickflash-backup-${Date.now()}.db`);
    try {
      fs.copyFileSync(this.dbPath, tempDb);
      archive.file(tempDb, { name: "master.db" });
    } catch (err: any) {
      this.logger.warn("[BackupService] Could not snapshot DB, using live file:", err.message);
      if (fs.existsSync(this.dbPath)) {
        archive.file(this.dbPath, { name: "master.db" });
      }
    }

    // 3. Uploads directory
    if (fs.existsSync(this.uploadsDir)) {
      archive.directory(this.uploadsDir, "uploads");
    }

    await archive.finalize();

    // Clean up temp DB snapshot
    try { fs.unlinkSync(tempDb); } catch (_) {}

    this.logger.info("[BackupService] Export streamed successfully");
  }

  /**
   * Restore from an uploaded backup zip buffer.
   * Returns a list of warnings (non-fatal issues encountered during restore).
   *
   * IMPORTANT: caller must restart the backend process after this returns.
   */
  async restore(zipBuffer: Buffer): Promise<string[]> {
    const warnings: string[] = [];

    // --- 1. Parse and validate archive ---
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (err: any) {
      throw new Error(`Invalid backup file — could not parse zip: ${err.message}`);
    }

    const manifestEntry = zip.getEntry("manifest.json");
    if (!manifestEntry) {
      throw new Error("Invalid backup file — missing manifest.json");
    }

    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString("utf8"));
    } catch {
      throw new Error("Invalid backup file — manifest.json is not valid JSON");
    }

    if (typeof manifest.version !== "number") {
      throw new Error("Invalid backup file — manifest.version is missing");
    }

    if (manifest.version > BACKUP_SCHEMA_VERSION) {
      throw new Error(
        `Backup was created with a newer version of ClickFlash ` +
        `(schema v${manifest.version}) — please upgrade the app first.`
      );
    }

    this.logger.info("[BackupService] Starting restore", {
      backupCreatedAt: manifest.createdAt,
      backupAppVersion: manifest.appVersion,
    });

    // --- 2. Restore SQLite database ---
    const dbEntry = zip.getEntry("master.db");
    if (dbEntry) {
      const dbBackupPath = `${this.dbPath}.pre-restore-${Date.now()}`;
      try {
        // Keep a rolling .pre-restore copy just in case
        if (fs.existsSync(this.dbPath)) {
          fs.copyFileSync(this.dbPath, dbBackupPath);
        }
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        fs.writeFileSync(this.dbPath, dbEntry.getData());
        this.logger.info("[BackupService] Database restored");
      } catch (err: any) {
        throw new Error(`Failed to restore database: ${err.message}`);
      }
    } else {
      warnings.push("master.db not found in backup — database was not restored");
    }

    // --- 3. Restore uploads ---
    const uploadsEntries = zip.getEntries().filter(e =>
      e.entryName.startsWith("uploads/") && !e.isDirectory
    );

    if (uploadsEntries.length > 0) {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
      let restoredCount = 0;
      for (const entry of uploadsEntries) {
        // Strip leading "uploads/" prefix then write to uploadsDir
        const relativePath = entry.entryName.replace(/^uploads\//, "");
        const destPath = path.join(this.uploadsDir, relativePath);

        // Security: prevent directory traversal
        const normalised = path.normalize(destPath);
        if (!normalised.startsWith(path.normalize(this.uploadsDir))) {
          warnings.push(`Skipped suspicious path: ${entry.entryName}`);
          continue;
        }

        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
        restoredCount++;
      }
      this.logger.info(`[BackupService] Restored ${restoredCount} upload file(s)`);
    } else {
      warnings.push("No upload files found in backup");
    }

    this.logger.info("[BackupService] Restore complete — server restart required");
    return warnings;
  }
}
