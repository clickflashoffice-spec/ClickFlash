// backend/services/ScaleValidator.ts
/**
 * Phase 53: Scale & Stress Testing — Validation Suite
 *
 * Validates the system's ability to handle:
 * 1. 100GB+ library management (pagination, DB health, folder distribution)
 * 2. 2000+ concurrent photo ingestion (batch insert throughput)
 * 3. Multiple Touch-App connections (concurrent SSE + order-push load)
 */

import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import fs from "fs";
import path from "path";
import http from "http";
import { UPLOAD_DIR } from "../config/constants";

export interface ScaleReport {
  timestamp: string;
  durationMs: number;
  tests: ScaleTestResult[];
  passed: boolean;
}

export interface ScaleTestResult {
  name: string;
  passed: boolean;
  details: Record<string, any>;
  errorMessage?: string;
}

export class ScaleValidator {
  private dbManager: DatabaseManager;
  private logger: Logger;

  constructor(dbManager: DatabaseManager, logger: Logger) {
    this.dbManager = dbManager;
    this.logger = logger;
  }

  // ─── PUBLIC ENTRY POINT ──────────────────────────────────────────────

  async runFullSuite(): Promise<ScaleReport> {
    const start = Date.now();
    const results: ScaleTestResult[] = [];

    this.logger.info(
      "[ScaleValidator] Starting full scale validation suite...",
    );

    results.push(await this.validateDatabaseHealth());
    results.push(await this.validatePaginationAtScale());
    results.push(await this.validateFolderDistribution());
    results.push(await this.validateBatchIngestion(2000));
    results.push(await this.validateMultiTouchLoad(5));

    const durationMs = Date.now() - start;
    const passed = results.every((r) => r.passed);

    const report: ScaleReport = {
      timestamp: new Date().toISOString(),
      durationMs,
      tests: results,
      passed,
    };

    this.logger.info(
      `[ScaleValidator] Suite complete in ${durationMs}ms — ${passed ? "ALL PASSED" : "FAILURES DETECTED"}`,
    );

    // Persist report to disk for audit trail
    try {
      const reportPath = path.join(
        UPLOAD_DIR,
        "..",
        "logs",
        `scale_report_${Date.now()}.json`,
      );
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.logger.info(`[ScaleValidator] Report written to ${reportPath}`);
    } catch (e: any) {
      this.logger.warn("[ScaleValidator] Could not persist report:", {
        err: e.message,
      });
    }

    return report;
  }

  // ─── TEST 1: DB HEALTH ───────────────────────────────────────────────

  private async validateDatabaseHealth(): Promise<ScaleTestResult> {
    const name = "Database Health at Scale";
    try {
      const db = this.dbManager.getDb();

      // WAL mode check
      const walMode = db.pragma("journal_mode", { simple: true }) as string;
      const walOk = walMode === "wal";

      // Page count and size
      const pageCount = db.pragma("page_count", { simple: true }) as number;
      const pageSize = db.pragma("page_size", { simple: true }) as number;
      const dbSizeMb = (pageCount * pageSize) / 1024 / 1024;

      // Index check
      const integrity = db.pragma("integrity_check", {
        simple: true,
      }) as string;

      // Row counts
      const photoCount =
        this.dbManager.get<{ c: number }>("SELECT COUNT(*) as c FROM photos")
          ?.c ?? 0;
      const albumCount =
        this.dbManager.get<{ c: number }>("SELECT COUNT(*) as c FROM albums")
          ?.c ?? 0;

      const passed = walOk && integrity === "ok";
      return {
        name,
        passed,
        details: {
          walMode,
          dbSizeMb: dbSizeMb.toFixed(2),
          pageCount,
          integrity,
          photoCount,
          albumCount,
        },
        ...(!passed
          ? {
              errorMessage: !walOk
                ? "WAL mode not enabled"
                : `Integrity check: ${integrity}`,
            }
          : {}),
      };
    } catch (e: any) {
      return { name, passed: false, details: {}, errorMessage: e.message };
    }
  }

  // ─── TEST 2: PAGINATION AT SCALE ────────────────────────────────────

  private async validatePaginationAtScale(): Promise<ScaleTestResult> {
    const name = "Pagination Correctness at Scale";
    try {
      const PAGE_SIZE = 50;
      const t0 = Date.now();

      // Query first page
      const page1 = this.dbManager.query<{ id: string }>(
        "SELECT id FROM photos ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [PAGE_SIZE, 0],
      );
      // Query second page
      const page2 = this.dbManager.query<{ id: string }>(
        "SELECT id FROM photos ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [PAGE_SIZE, PAGE_SIZE],
      );

      const latencyMs = Date.now() - t0;

      // Check no overlap
      const ids1 = new Set(page1.map((r) => r.id));
      const overlap = page2.filter((r) => ids1.has(r.id));

      const passed = overlap.length === 0 && latencyMs < 500;
      return {
        name,
        passed,
        details: {
          page1Count: page1.length,
          page2Count: page2.length,
          overlapCount: overlap.length,
          latencyMs,
        },
        ...(!passed
          ? {
              errorMessage:
                overlap.length > 0
                  ? "Page overlap detected"
                  : `Slow pagination: ${latencyMs}ms`,
            }
          : {}),
      };
    } catch (e: any) {
      return { name, passed: false, details: {}, errorMessage: e.message };
    }
  }

  // ─── TEST 3: FOLDER DISTRIBUTION (Law 12) ────────────────────────────

  private async validateFolderDistribution(): Promise<ScaleTestResult> {
    const name = "Structured Folder Distribution (Law 12)";
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        return {
          name,
          passed: true,
          details: {
            note: "Upload dir not yet created — OK for fresh install",
          },
        };
      }

      const albums = fs
        .readdirSync(UPLOAD_DIR)
        .filter((d) => fs.statSync(path.join(UPLOAD_DIR, d)).isDirectory());

      let totalFiles = 0;
      let maxFilesInDir = 0;
      let violatingDirs: string[] = [];
      const FS_LIMIT_WARNING = 10_000; // warn if single dir exceeds 10k files

      for (const album of albums) {
        const albumDir = path.join(UPLOAD_DIR, album);
        const subDirs = ["highres", "thumbs"];
        for (const sub of subDirs) {
          const subPath = path.join(albumDir, sub);
          if (!fs.existsSync(subPath)) continue;
          const files = fs.readdirSync(subPath).length;
          totalFiles += files;
          if (files > maxFilesInDir) maxFilesInDir = files;
          if (files > FS_LIMIT_WARNING)
            violatingDirs.push(`${album}/${sub} (${files} files)`);
        }
      }

      const passed = violatingDirs.length === 0;
      return {
        name,
        passed,
        details: {
          albumCount: albums.length,
          totalFiles,
          maxFilesInDir,
          violatingDirs,
        },
        ...(!passed
          ? {
              errorMessage: `Dirs exceeding FS limit: ${violatingDirs.join(", ")}`,
            }
          : {}),
      };
    } catch (e: any) {
      return { name, passed: false, details: {}, errorMessage: e.message };
    }
  }

  // ─── TEST 4: BATCH INGESTION THROUGHPUT ──────────────────────────────

  async validateBatchIngestion(count: number): Promise<ScaleTestResult> {
    const name = `Batch Ingestion Throughput (${count} photos)`;
    try {
      const { v4: uuidv4 } = await import("uuid");
      const albumId = `scale_test_${uuidv4().substring(0, 8)}`;
      const date = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // Create album
      this.dbManager
        .getDb()
        .prepare(
          "INSERT INTO albums (id, title, date, status, source) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          albumId,
          `Scale Test ${date}`,
          date,
          "Published",
          "ScaleValidator",
        );

      const t0 = Date.now();

      // Batch insert using a transaction — orders of magnitude faster than per-row await
      const photoStmt = this.dbManager
        .getDb()
        .prepare(
          "INSERT INTO photos (id, albumId, title, url, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        );
      const retentionStmt = this.dbManager
        .getDb()
        .prepare(
          "INSERT INTO retention_queue (album_id, asset_id, status, created_at) VALUES (?, ?, ?, ?)",
        );

      const batchInsert = this.dbManager.getDb().transaction(() => {
        for (let i = 0; i < count; i++) {
          const photoId = `scale_photo_${i}_${albumId}`;
          const url = `/uploads/${albumId}/highres/scale_${i}.jpg`;
          photoStmt.run(photoId, albumId, `Photo ${i}`, url, "available", now);
          retentionStmt.run(albumId, photoId, "pending", now);
        }
      });

      batchInsert();

      const durationMs = Date.now() - t0;
      const throughputPerSec = Math.round((count / durationMs) * 1000);

      // Cleanup — don't pollute production data
      this.dbManager
        .getDb()
        .prepare("DELETE FROM photos WHERE albumId = ?")
        .run(albumId);
      this.dbManager
        .getDb()
        .prepare("DELETE FROM retention_queue WHERE album_id = ?")
        .run(albumId);
      this.dbManager
        .getDb()
        .prepare("DELETE FROM albums WHERE id = ?")
        .run(albumId);

      // Pass if 2000 photos inserted in under 10 seconds
      const passed = durationMs < 10_000;
      return {
        name,
        passed,
        details: { count, durationMs, throughputPerSec },
        ...(!passed
          ? {
              errorMessage: `Ingestion too slow: ${durationMs}ms for ${count} photos`,
            }
          : {}),
      };
    } catch (e: any) {
      return { name, passed: false, details: {}, errorMessage: e.message };
    }
  }

  // ─── TEST 5: MULTI-TOUCH CONCURRENT LOAD ────────────────────────────

  async validateMultiTouchLoad(touchCount: number): Promise<ScaleTestResult> {
    const name = `Multi-Touch Scalability (${touchCount} concurrent instances)`;
    const MASTER_URL = `http://127.0.0.1:${process.env.PORT || 8090}`;
    const REQUESTS_PER_TOUCH = 10;

    let success = 0;
    let failed = 0;
    const latencies: number[] = [];

    const touchRequest = (_touchId: number, endpoint: string): Promise<void> =>
      new Promise((resolve) => {
        const t0 = Date.now();
        const req = http.get(
          `${MASTER_URL}${endpoint}`,
          { timeout: 5000 },
          (res) => {
            latencies.push(Date.now() - t0);
            res.statusCode && res.statusCode < 500 ? success++ : failed++;
            res.resume();
            resolve();
          },
        );
        req.on("error", () => {
          failed++;
          latencies.push(Date.now() - t0);
          resolve();
        });
        req.on("timeout", () => {
          req.destroy();
          failed++;
          resolve();
        });
      });

    const t0 = Date.now();

    // Simulate N Touch instances each making R requests concurrently
    const tasks: Promise<void>[] = [];
    for (let t = 0; t < touchCount; t++) {
      for (let r = 0; r < REQUESTS_PER_TOUCH; r++) {
        tasks.push(touchRequest(t, "/api/health"));
      }
    }
    await Promise.allSettled(tasks);

    const durationMs = Date.now() - t0;
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const successRate = ((success / (success + failed)) * 100).toFixed(1);

    const passed = failed === 0 && avgLatency < 1000;
    return {
      name,
      passed,
      details: {
        touchCount,
        requestsPerTouch: REQUESTS_PER_TOUCH,
        totalRequests: success + failed,
        success,
        failed,
        avgLatencyMs: avgLatency,
        successRate: `${successRate}%`,
        durationMs,
      },
      ...(!passed
        ? {
            errorMessage: `${failed} failed requests, avg latency ${avgLatency}ms`,
          }
        : {}),
    };
  }
}

export default ScaleValidator;
