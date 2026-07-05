/**
 * ClickFlash Master Backend - Full Audit System
 * 
 * Automatically runs comprehensive health checks when Electron starts.
 * Reports are saved to the audit logs directory and displayed in the UI.
 * 
 * @module AuditService
 * @version 1.0.0
 */

import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import AuditLogger from '../utils/auditLogger';
import fs from "fs";
import path from "path";
import os from "os";


// ─── Types ───────────────────────────────────────────────────────────────────

import { AuditCheck, AuditReport, AuditResultEntry, CategorySummary } from './audit/auditTypes';

// ─── Constants ─────────────────────────────────────────────────────────────

const AUDIT_VERSION = "1.0.0";
const REPORT_DIR = "audit-reports";

// ─── Helper Functions ──────────────────────────────────────────────────────

function getReportDir(dataDir: string): string {
  const dir = path.join(dataDir, REPORT_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateReportId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}



import { getBackupChecks, getConfigurationChecks, getDatabaseChecks, getDependenciesChecks, getElectronChecks, getFilesystemChecks, getNetworkChecks, getPerformanceChecks, getSecurityChecks, getServicesChecks } from './audit/checks';

function createAuditChecks(dbManager: DatabaseManager, logger: Logger, auditLogger: AuditLogger, config: any): AuditCheck[] {
  return [
    ...getBackupChecks(dbManager, logger, auditLogger, config),
    ...getConfigurationChecks(dbManager, logger, auditLogger, config),
    ...getDatabaseChecks(dbManager, logger, auditLogger, config),
    ...getDependenciesChecks(dbManager, logger, auditLogger, config),
    ...getElectronChecks(dbManager, logger, auditLogger, config),
    ...getFilesystemChecks(dbManager, logger, auditLogger, config),
    ...getNetworkChecks(dbManager, logger, auditLogger, config),
    ...getPerformanceChecks(dbManager, logger, auditLogger, config),
    ...getSecurityChecks(dbManager, logger, auditLogger, config),
    ...getServicesChecks(dbManager, logger, auditLogger, config)
  ];
}

// ─── Audit Runner ──────────────────────────────────────────────────────────

export class AuditService {
  private checks: AuditCheck[];
  private dataDir: string;
  private logger: Logger;

  constructor(
    dbManager: DatabaseManager,
    logger: Logger,
    auditLogger: AuditLogger,
    config: any
  ) {
    this.checks = createAuditChecks(dbManager, logger, auditLogger, config);
    this.dataDir = config.DATA_DIR || "./pb_data";
    this.logger = logger;
  }

  async runAudit(): Promise<AuditReport> {
    const reportId = generateReportId();
    const startTime = Date.now();
    const categories: Record<string, CategorySummary> = {};
    const checks: AuditResultEntry[] = [];

    this.logger.info(`[Audit] Starting full system audit (${this.checks.length} checks)...`);

    for (const check of this.checks) {
      const checkStart = Date.now();
      try {
        const result = await check.run();
        const entry: AuditResultEntry = {
          ...result,
          checkId: check.id,
          checkName: check.name,
          category: check.category,
          severity: check.severity,
        };
        checks.push(entry);

        // Update category summary
        if (!categories[check.category]) {
          categories[check.category] = { total: 0, passed: 0, failed: 0, warnings: 0 };
        }
        categories[check.category].total++;
        if (result.status === "pass") categories[check.category].passed++;
        else if (result.status === "fail") categories[check.category].failed++;
        else if (result.status === "warn") categories[check.category].warnings++;

        this.logger.info(
          `[Audit] ${check.category}/${check.id}: ${result.status.toUpperCase()} — ${result.message}`
        );
      } catch (err: any) {
        const entry: AuditResultEntry = {
          passed: false,
          status: "fail",
          message: `Check crashed: ${err.message}`,
          checkId: check.id,
          checkName: check.name,
          category: check.category,
          severity: check.severity,
          duration: Date.now() - checkStart,
        };
        checks.push(entry);
        this.logger.error(`[Audit] ${check.id} crashed:`, err);
      }
    }

    const totalChecks = checks.length;
    // @ts-ignore
    const passed = checks.filter((c) => c.status === "pass").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const warnings = checks.filter((c) => c.status === "warn").length;
    const skipped = checks.filter((c) => c.status === "skip").length;
    const duration = Date.now() - startTime;

    const report: AuditReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      version: AUDIT_VERSION,
      hostname: os.hostname(),
      platform: `${os.platform()} ${os.arch()}`,
      totalChecks,
      passed,
      failed,
      warnings,
      skipped,
      duration,
      categories,
      checks,
      summary: this.generateSummary(passed, failed, warnings, totalChecks),
    };

    this.saveReport(report);
    this.logger.info(`[Audit] Complete — ${passed}/${totalChecks} passed, ${failed} failed, ${warnings} warnings`);

    return report;
  }

    // @ts-ignore
  private generateSummary(passed: number, failed: number, warnings: number, total: number): string {
    // @ts-ignore
    if (failed > 0) {
      return `CRITICAL: ${failed} check(s) failed. Immediate attention required.`;
    }
    if (warnings > 0) {
      return `WARNING: ${warnings} check(s) need attention. System is functional but not optimal.`;
    }
    return `HEALTHY: All ${total} checks passed. System is fully operational.`;
  }

  private saveReport(report: AuditReport): void {
    const reportDir = getReportDir(this.dataDir);
    const filename = `${report.id}.json`;
    const filepath = path.join(reportDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    // Also save as latest
    const latestPath = path.join(reportDir, "latest.json");
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    const summaryPath = path.join(reportDir, "latest-summary.txt");
    const summary = this.formatReportText(report);
    fs.writeFileSync(summaryPath, summary);

    this.logger.info(`[Audit] Report saved: ${filepath}`);
  }

  private formatReportText(report: AuditReport): string {
    const lines = [
      `╔══════════════════════════════════════════════════════════════╗`,
      `║           ClickFlash Master - System Audit Report              ║`,
      `╠══════════════════════════════════════════════════════════════╣`,
      `  Report ID:    ${report.id}`,
      `  Timestamp:    ${report.timestamp}`,
      `  Version:      ${report.version}`,
      `  Host:         ${report.hostname}`,
      `  Platform:     ${report.platform}`,
      `  Duration:     ${formatDuration(report.duration)}`,
      ``,
      `  RESULTS: ${report.passed}/${report.totalChecks} passed, ${report.failed} failed, ${report.warnings} warnings`,
      `  STATUS:  ${report.summary}`,
      ``,
      `────────────────────────────────────────────────────────────────`,
      `  CATEGORY BREAKDOWN`,
      `────────────────────────────────────────────────────────────────`,
    ];

    for (const [cat, stats] of Object.entries(report.categories)) {
      const icon = stats.failed > 0 ? "❌" : stats.warnings > 0 ? "⚠️" : "✅";
      lines.push(`  ${icon} ${cat.padEnd(15)} | ${stats.passed}/${stats.total} passed`);
    }

    lines.push(
      ``,
      `────────────────────────────────────────────────────────────────`,
      `  FAILED / WARNED CHECKS`,
      `────────────────────────────────────────────────────────────────`
    );

    const issues = report.checks.filter((c) => c.status !== "pass");
    if (issues.length === 0) {
      lines.push(`  ✅ All checks passed — no issues to report`);
    } else {
      for (const issue of issues) {
        const icon = issue.status === "fail" ? "❌" : "⚠️";
        lines.push(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.checkName}`);
        lines.push(`     └─ ${issue.message}`);
        if (issue.remediation) {
          lines.push(`     └─ Fix: ${issue.remediation}`);
        }
        lines.push("");
      }
    }

    lines.push(
      `────────────────────────────────────────────────────────────────`,
      `  END OF REPORT`,
      `────────────────────────────────────────────────────────────────`
    );

    return lines.join("\n");
  }

  getLatestReport(): AuditReport | null {
    const latestPath = path.join(getReportDir(this.dataDir), "latest.json");
    if (!fs.existsSync(latestPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(latestPath, "utf-8")) as AuditReport;
    } catch {
      return null;
    }
  }

  getReportHistory(limit: number = 10): AuditReport[] {
    const reportDir = getReportDir(this.dataDir);
    if (!fs.existsSync(reportDir)) return [];
    return fs
      .readdirSync(reportDir)
      .filter((f) => f.startsWith("audit-") && f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, limit)
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(reportDir, f), "utf-8")) as AuditReport;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as AuditReport[];
  }
}

export default AuditService;
