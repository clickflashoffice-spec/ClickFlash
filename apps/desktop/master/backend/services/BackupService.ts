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
import crypto from "crypto";
import archiver from "archiver";
import AdmZip from "adm-zip";
import { Logger } from '../utils/logger';

export interface BackupManifest {
  version: number;       // schema version for future migration support
  appVersion: string;    // package.json version at backup time
  createdAt: string;     // ISO timestamp
  platform: string;
  hostname: string;
  type?: 'full' | 'incremental';
  since?: string;
  checksum?: string;
}

const BACKUP_SCHEMA_VERSION = 1;
const APP_VERSION = process.env.npm_package_version || "4.2.0";

export class BackupService {
  private _lastSuccessTimestamp: number | null = null;

  constructor(
    private readonly dbPath: string,
    private readonly uploadsDir: string,
    private readonly logger: Logger,
    private readonly backupDir: string = "./backups",
  ) {}

  public recordSuccess(): void {
    this._lastSuccessTimestamp = Date.now();
  }

  public getStats(): { lastSuccessTimestamp: number | null } {
    let latestTime = this._lastSuccessTimestamp;
    try {
      if (this.backupDir && fs.existsSync(this.backupDir)) {
        const files = fs.readdirSync(this.backupDir);
        for (const file of files) {
          if (file.endsWith(".db") || file.endsWith(".clickflash-backup") || file.endsWith(".zip")) {
            const stat = fs.statSync(path.join(this.backupDir, file));
            if (stat.mtimeMs && (!latestTime || stat.mtimeMs > latestTime)) {
              latestTime = Math.round(stat.mtimeMs);
            }
          }
        }
      }
    } catch (_) {
      // ignore filesystem scan errors
    }
    return {
      lastSuccessTimestamp: latestTime,
    };
  }

  async calculateFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("error", (err) => reject(err));
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
    });
  }

  async createIncrementalSnapshot(since?: string): Promise<{ manifest: BackupManifest; zipBuffer: Buffer }> {
    const stream = new (require("stream").PassThrough)();
    const chunks: Buffer[] = [];
    
    const exportPromise = this.streamExport(stream, { incremental: true, since });
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    await exportPromise;
    
    const zipBuffer = Buffer.concat(chunks);
    const zip = new AdmZip(zipBuffer);
    const manifestEntry = zip.getEntry("manifest.json");
    const manifest = JSON.parse(manifestEntry!.getData().toString("utf8"));
    return { manifest, zipBuffer };
  }

  /**
   * Stream a complete or incremental backup archive to the given writable stream.
   * Caller is responsible for setting response headers before piping.
   */
  async streamExport(
    destination: NodeJS.WritableStream,
    options: { incremental?: boolean; since?: string } = {}
  ): Promise<void> {
    const dbChecksum = fs.existsSync(this.dbPath) ? await this.calculateFileChecksum(this.dbPath) : "";

    const manifest: BackupManifest = {
      version: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      platform: process.platform,
      hostname: os.hostname(),
      type: options.incremental ? 'incremental' : 'full',
      since: options.since || undefined,
      checksum: dbChecksum || undefined,
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
      if (options.incremental && options.since) {
        const sinceTime = new Date(options.since).getTime();
        const addFilesRecursively = (dir: string, baseDir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              addFilesRecursively(fullPath, baseDir);
            } else if (entry.isFile()) {
              try {
                const stat = fs.statSync(fullPath);
                if (stat.mtimeMs > sinceTime || isNaN(sinceTime)) {
                  const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
                  archive.file(fullPath, { name: `uploads/${relPath}` });
                }
              } catch (_) {}
            }
          }
        };
        addFilesRecursively(this.uploadsDir, this.uploadsDir);
      } else {
        archive.directory(this.uploadsDir, "uploads");
      }
    }

    await archive.finalize();

    // Clean up temp DB snapshot
    try { fs.unlinkSync(tempDb); } catch (_) {}

    this.logger.info("[BackupService] Export streamed successfully", {
      type: manifest.type,
      checksum: manifest.checksum,
    });
    this.recordSuccess();
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
      if (manifest.checksum) {
        const calculatedHash = crypto.createHash("sha256").update(dbEntry.getData()).digest("hex");
        if (calculatedHash !== manifest.checksum) {
          throw new Error(`Invalid backup file — database checksum verification failed (expected ${manifest.checksum}, got ${calculatedHash})`);
        }
        this.logger.info("[BackupService] Database checksum verified successfully", { checksum: manifest.checksum });
      }

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
