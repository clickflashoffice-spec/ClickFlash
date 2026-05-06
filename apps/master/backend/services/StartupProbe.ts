import fs from "fs";
import path from "path";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import { DATA_DIR, UPLOAD_DIR, BACKUP_DIR, LOGS_DIR } from "../config/constants";
import si from "systeminformation";

/**
 * Phase 15: StartupProbe
 * Pre-flight verification suite that validates all critical subsystems
 * before the server accepts traffic.
 */

export type ProbeStatus = "PASS" | "FAIL" | "WARN";
export type BootVerdict = "READY" | "DEGRADED" | "FATAL";

export interface ProbeResult {
  name: string;
  status: ProbeStatus;
  message: string;
  durationMs: number;
  critical: boolean;
}

export interface StartupReport {
  verdict: BootVerdict;
  timestamp: string;
  bootDurationMs: number;
  probes: ProbeResult[];
  failedCritical: string[];
  warnings: string[];
}

export class StartupProbe {
  constructor(
    private dbManager: DatabaseManager,
    private logger: Logger
  ) {}

  /**
   * Execute all probes and produce a boot report.
   */
  public async execute(): Promise<StartupReport> {
    const bootStart = Date.now();
    this.logger.info("[StartupProbe] Running pre-flight checks...");

    const probes: ProbeResult[] = [];

    // Run probes in order of criticality
    probes.push(await this.probeDatabase());
    probes.push(await this.probeFilesystem());
    probes.push(await this.probeDisk());
    probes.push(await this.probeServices());

    const bootDurationMs = Date.now() - bootStart;

    // Determine verdict
    const failedCritical = probes.filter(p => p.status === "FAIL" && p.critical).map(p => p.name);
    const warnings = probes.filter(p => p.status === "WARN" || (p.status === "FAIL" && !p.critical)).map(p => p.name);

    let verdict: BootVerdict;
    if (failedCritical.length > 0) {
      verdict = "FATAL";
    } else if (warnings.length > 0) {
      verdict = "DEGRADED";
    } else {
      verdict = "READY";
    }

    const report: StartupReport = {
      verdict,
      timestamp: new Date().toISOString(),
      bootDurationMs,
      probes,
      failedCritical,
      warnings,
    };

    // Persist boot report
    this.persistReport(report);

    // Log results
    const statusIcon = verdict === "READY" ? "PASS" : verdict === "DEGRADED" ? "WARN" : "FAIL";
    this.logger.info(`[StartupProbe] Pre-flight complete: ${statusIcon} (${bootDurationMs}ms)`, {
      verdict,
      passed: probes.filter(p => p.status === "PASS").length,
      warned: warnings.length,
      failed: failedCritical.length,
    });

    for (const probe of probes) {
      const icon = probe.status === "PASS" ? "OK" : probe.status === "WARN" ? "WARN" : "FAIL";
      this.logger.info(`  [${icon}] ${probe.name}: ${probe.message} (${probe.durationMs}ms)`);
    }

    return report;
  }

  // ── Individual Probes ─────────────────────────────────────────────────

  private async probeDatabase(): Promise<ProbeResult> {
    const start = Date.now();
    try {
      // Basic connectivity
      const row = this.dbManager.get<{ one: number }>("SELECT 1 as one");
      if (row?.one !== 1) throw new Error("SELECT 1 returned unexpected result");

      // WAL mode check (Law 19: Power-Loss Recovery)
      const walMode = this.dbManager.get<{ journal_mode: string }>("PRAGMA journal_mode");
      if (walMode?.journal_mode !== "wal") {
        return {
          name: "database",
          status: "WARN",
          message: `Journal mode is '${walMode?.journal_mode}', expected 'wal'`,
          durationMs: Date.now() - start,
          critical: false,
        };
      }

      // Migration version check
      let migrationCount = 0;
      try {
        const mc = this.dbManager.get<{ c: number }>("SELECT COUNT(*) as c FROM migrations");
        migrationCount = mc?.c || 0;
      } catch {
        // migrations table might not exist yet on very first boot
      }

      return {
        name: "database",
        status: "PASS",
        message: `SQLite OK, WAL mode, ${migrationCount} migrations applied`,
        durationMs: Date.now() - start,
        critical: true,
      };
    } catch (error: any) {
      return {
        name: "database",
        status: "FAIL",
        message: `Database unreachable: ${error.message}`,
        durationMs: Date.now() - start,
        critical: true,
      };
    }
  }

  private async probeFilesystem(): Promise<ProbeResult> {
    const start = Date.now();
    const dirs = [
      { name: "DATA_DIR", path: DATA_DIR },
      { name: "UPLOAD_DIR", path: UPLOAD_DIR },
      { name: "BACKUP_DIR", path: BACKUP_DIR },
      { name: "LOGS_DIR", path: LOGS_DIR },
    ];

    const missing: string[] = [];
    const unwritable: string[] = [];

    for (const dir of dirs) {
      if (!fs.existsSync(dir.path)) {
        try {
          fs.mkdirSync(dir.path, { recursive: true });
        } catch {
          missing.push(dir.name);
          continue;
        }
      }

      // Write test
      const testFile = path.join(dir.path, `.probe_${Date.now()}`);
      try {
        fs.writeFileSync(testFile, "probe");
        fs.unlinkSync(testFile);
      } catch {
        unwritable.push(dir.name);
      }
    }

    if (missing.length > 0) {
      return {
        name: "filesystem",
        status: "FAIL",
        message: `Cannot create directories: ${missing.join(", ")}`,
        durationMs: Date.now() - start,
        critical: true,
      };
    }

    if (unwritable.length > 0) {
      return {
        name: "filesystem",
        status: "FAIL",
        message: `Directories not writable: ${unwritable.join(", ")}`,
        durationMs: Date.now() - start,
        critical: true,
      };
    }

    return {
      name: "filesystem",
      status: "PASS",
      message: `All ${dirs.length} directories exist and are writable`,
      durationMs: Date.now() - start,
      critical: true,
    };
  }

  private async probeDisk(): Promise<ProbeResult> {
    const start = Date.now();
    try {
      const fsStats = await si.fsSize();
      const mainDisk = fsStats[0];
      if (!mainDisk) {
        return {
          name: "disk",
          status: "WARN",
          message: "Unable to read disk metrics",
          durationMs: Date.now() - start,
          critical: false,
        };
      }

      const availableGb = mainDisk.available / (1024 ** 3);
      const usedPercent = mainDisk.use;

      // Fetch thresholds from DB (with safe defaults)
      let minFreeGb = 1;
      let critPercent = 95;
      try {
        const minRow = this.dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'health_min_free_gb'");
        if (minRow) minFreeGb = parseFloat(minRow.value);
        const critRow = this.dbManager.get<{ value: string }>("SELECT value FROM settings WHERE key = 'health_disk_critical_percent'");
        if (critRow) critPercent = parseFloat(critRow.value);
      } catch { /* use defaults */ }

      if (availableGb < minFreeGb || usedPercent > critPercent) {
        return {
          name: "disk",
          status: "FAIL",
          message: `CRITICAL: ${availableGb.toFixed(1)}GB free (${usedPercent.toFixed(1)}% used)`,
          durationMs: Date.now() - start,
          critical: false, // Not fatal — system can still boot, but enters DEGRADED
        };
      }

      if (usedPercent > 90) {
        return {
          name: "disk",
          status: "WARN",
          message: `Disk pressure: ${availableGb.toFixed(1)}GB free (${usedPercent.toFixed(1)}% used)`,
          durationMs: Date.now() - start,
          critical: false,
        };
      }

      return {
        name: "disk",
        status: "PASS",
        message: `${availableGb.toFixed(1)}GB free (${usedPercent.toFixed(1)}% used)`,
        durationMs: Date.now() - start,
        critical: false,
      };
    } catch (error: any) {
      return {
        name: "disk",
        status: "WARN",
        message: `Disk check failed: ${error.message}`,
        durationMs: Date.now() - start,
        critical: false,
      };
    }
  }

  private async probeServices(): Promise<ProbeResult> {
    const start = Date.now();
    const checks: string[] = [];

    // Verify key tables exist (proxy for service readiness)
    const requiredTables = ["photos", "albums", "orders", "users", "settings"];
    for (const table of requiredTables) {
      try {
        this.dbManager.get<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
      } catch {
        checks.push(table);
      }
    }

    if (checks.length > 0) {
      return {
        name: "services",
        status: "WARN",
        message: `Missing tables: ${checks.join(", ")}`,
        durationMs: Date.now() - start,
        critical: false,
      };
    }

    return {
      name: "services",
      status: "PASS",
      message: `All ${requiredTables.length} core tables verified`,
      durationMs: Date.now() - start,
      critical: false,
    };
  }

  // ── Persistence ───────────────────────────────────────────────────────

  private persistReport(report: StartupReport) {
    try {
      this.dbManager.run(
        `INSERT INTO system_health_log (timestamp, event_type, verdict, probes_json, boot_duration_ms, metadata)
         VALUES (?, 'BOOT', ?, ?, ?, ?)`,
        [
          report.timestamp,
          report.verdict,
          JSON.stringify(report.probes),
          report.bootDurationMs,
          JSON.stringify({ failedCritical: report.failedCritical, warnings: report.warnings }),
        ]
      );
    } catch (error: any) {
      this.logger.warn("[StartupProbe] Failed to persist boot report", { error: error.message });
    }
  }
}
