// backend/shared/orphanScanner.ts
// P0-1 fix: Bidirectional orphan reconciliation between DB rows and filesystem assets.
//
//   - FS→DB: files on disk with no matching photos row (re-registered).
//   - DB→FS: photos rows whose storage_path_*.{jpg,webp} are missing on disk (flagged for review).
//
// Runs on a schedule via MaintenanceService, in addition to the one-shot
// recoverOrphanedFiles() already exported from orphanRecovery.ts.

import fs from "fs";
import path from "path";
import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import { UPLOAD_DIR } from "../config/constants";
import { recoverOrphanedFiles } from "./orphanRecovery";

/** Storage tier columns we track in the `photos` table. */
const STORAGE_TIERS: Array<{ column: string; suffix: string; required: boolean }> = [
  { column: "storage_path_highres",    suffix: ".jpg",  required: true  },
  { column: "storage_path_preview",    suffix: ".jpg",  required: true  },
  { column: "storage_path_thumb",      suffix: ".jpg",  required: true  },
  { column: "storage_path_tiny",       suffix: ".jpg",  required: false },
  { column: "storage_path_watermarked",suffix: ".webp", required: false },
];

/** Audit table for orphan reports (created on first run). */
const ORPHAN_AUDIT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS orphan_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    direction TEXT NOT NULL CHECK(direction IN ('fs_to_db','db_to_fs')),
    album_id TEXT,
    photo_id TEXT,
    file_path TEXT,
    issue TEXT NOT NULL,
    action_taken TEXT,
    severity TEXT NOT NULL DEFAULT 'info'
  );
  CREATE INDEX IF NOT EXISTS idx_orphan_audit_scanned ON orphan_audit(scanned_at);
  CREATE INDEX IF NOT EXISTS idx_orphan_audit_photo   ON orphan_audit(photo_id);
`;

export interface ScanReport {
  scanId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fsToDb: {
    candidates: number;
    recovered: number;
    skipped: number;
    failed: number;
  };
  dbToFs: {
    scanned: number;
    missingHighres: number;
    missingDerivatives: number;
    flagged: number;
  };
  errors: string[];
}

/**
 * Scan the upload directory for files with no matching photos row.
 * Delegates to recoverOrphanedFiles() from orphanRecovery.ts and wraps it
 * with audit logging.
 */
async function scanFsOrphans(
  uploadDir: string,
  db: DatabaseManager,
  logger: Logger,
  scanId: string,
): Promise<{ recovered: number; skipped: number; failed: number; errors: string[] }> {
  const result = { recovered: 0, skipped: 0, failed: 0, errors: [] as string[] };
  try {
    const rec = await recoverOrphanedFiles(uploadDir, db, undefined, logger);
    result.recovered = rec.recovered;
    result.failed = rec.failed;
    result.errors = rec.errors;
    // Anything else is "skipped" (already in DB, duplicate, or album missing)
    result.skipped = Math.max(0, rec.totalFound - rec.recovered - rec.failed);

    // Audit log
    db.run(
      `INSERT INTO orphan_audit (scan_id, direction, issue, action_taken, severity) VALUES (?, 'fs_to_db', ?, ?, ?)`,
      [
        scanId,
        `Found ${rec.totalFound} candidate file(s) on disk; recovered ${rec.recovered}, failed ${rec.failed}`,
        rec.recovered > 0 ? "re-registered" : "no-op",
        rec.failed > 0 ? "warn" : "info",
      ],
    );
  } catch (err: any) {
    logger.error("[OrphanScanner] FS→DB scan failed", { error: err.message });
    result.errors.push(`FS→DB fatal: ${err.message}`);
  }
  return result;
}

/**
 * Scan the photos table for rows whose storage paths don't exist on disk.
 * Does NOT delete rows (would be destructive) — only flags them with
 * severity and an entry in orphan_audit.
 */
function scanDbOrphans(
  db: DatabaseManager,
  logger: Logger,
  scanId: string,
): { scanned: number; missingHighres: number; missingDerivatives: number; flagged: number; errors: string[] } {
  const result = { scanned: 0, missingHighres: 0, missingDerivatives: 0, flagged: 0, errors: [] as string[] };
  try {
    const rows = db.query(
      `SELECT id, albumId as album_id,
              url as storage_path_highres,
              previewUrl as storage_path_preview,
              thumbnailUrl as storage_path_thumb,
              tinyUrl as storage_path_tiny,
              watermarked_url as storage_path_watermarked
         FROM photos`,
    ) as Array<Record<string, string>>;

    result.scanned = rows.length;

    for (const row of rows) {
      let highresMissing = false;
      const missingTiers: string[] = [];

      for (const tier of STORAGE_TIERS) {
        const rel = row[tier.column];
        if (!rel) continue;
        const abs = path.isAbsolute(rel) ? rel : path.join(UPLOAD_DIR, "..", rel);
        if (!fs.existsSync(abs)) {
          if (tier.required) {
            if (tier.suffix === ".jpg" && tier.column === "storage_path_highres") {
              highresMissing = true;
            } else {
              missingTiers.push(tier.column);
            }
          }
        }
      }

      if (highresMissing) {
        result.missingHighres++;
        result.flagged++;
        const severity = "critical";
        db.run(
          `INSERT INTO orphan_audit (scan_id, direction, album_id, photo_id, file_path, issue, action_taken, severity)
           VALUES (?, 'db_to_fs', ?, ?, ?, ?, 'flagged', ?)`,
          [
            scanId,
            row.album_id,
            row.id,
            row.storage_path_highres,
            "High-res file missing on disk",
            severity,
          ],
        );
        logger.warn(`[OrphanScanner] DB→FS: high-res missing for photo ${row.id} (album ${row.album_id})`);
      } else if (missingTiers.length > 0) {
        result.missingDerivatives++;
        // Don't flag — non-critical tiers can be regenerated
        db.run(
          `INSERT INTO orphan_audit (scan_id, direction, album_id, photo_id, file_path, issue, action_taken, severity)
           VALUES (?, 'db_to_fs', ?, ?, ?, ?, 'recoverable', 'warn')`,
          [
            scanId,
            row.album_id,
            row.id,
            row.storage_path_preview,
            `Missing derivative tier(s): ${missingTiers.join(", ")} — can be regenerated by photoWorker`,
          ],
        );
      }
    }
  } catch (err: any) {
    logger.error("[OrphanScanner] DB→FS scan failed", { error: err.message });
    result.errors.push(`DB→FS fatal: ${err.message}`);
  }
  return result;
}

/**
 * Ensure the orphan_audit table exists. Safe to call on every boot.
 */
export function ensureOrphanAuditSchema(db: DatabaseManager): void {
  db.exec(ORPHAN_AUDIT_SCHEMA);
}

/**
 * Run a full bidirectional scan. Returns a ScanReport summarizing both passes.
 * This is the entry point used by MaintenanceService on a 6-hour interval.
 */
export async function runOrphanScan(
  db: DatabaseManager,
  logger: Logger,
  uploadDir: string = UPLOAD_DIR,
): Promise<ScanReport> {
  ensureOrphanAuditSchema(db);
  const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  logger.info(`[OrphanScanner] Starting scan ${scanId} on ${uploadDir}`);

  // 1) FS→DB: find files with no DB row, re-register
  const fsResult = await scanFsOrphans(uploadDir, db, logger, scanId);

  // 2) DB→FS: find rows whose files are missing
  const dbResult = scanDbOrphans(db, logger, scanId);

  const report: ScanReport = {
    scanId,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    fsToDb: {
      candidates: fsResult.recovered + fsResult.skipped + fsResult.failed,
      recovered: fsResult.recovered,
      skipped: fsResult.skipped,
      failed: fsResult.failed,
    },
    dbToFs: {
      scanned: dbResult.scanned,
      missingHighres: dbResult.missingHighres,
      missingDerivatives: dbResult.missingDerivatives,
      flagged: dbResult.flagged,
    },
    errors: [...fsResult.errors, ...dbResult.errors],
  };

  logger.info(
    `[OrphanScanner] Scan ${scanId} complete: ${report.durationMs}ms ` +
    `(FS→DB: ${report.fsToDb.candidates} found, ${report.fsToDb.recovered} recovered; ` +
    `DB→FS: ${report.dbToFs.scanned} scanned, ${report.dbToFs.missingHighres} missing high-res)`,
  );

  return report;
}

/**
 * Return the last N orphan audit entries for admin/ops viewing.
 */
export function getRecentOrphanReports(db: DatabaseManager, limit: number = 50): Array<Record<string, unknown>> {
  return db.query(
    `SELECT scan_id, scanned_at, direction, album_id, photo_id, file_path, issue, action_taken, severity
       FROM orphan_audit
       ORDER BY scanned_at DESC
       LIMIT ?`,
    [limit],
  ) as Array<Record<string, unknown>>;
}
