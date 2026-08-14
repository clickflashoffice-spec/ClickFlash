import { DatabaseManager } from '../../../database/db';
import { Logger } from '../../../utils/logger';
import AuditLogger from '../../../utils/auditLogger';
// @ts-ignore
import fs from "fs";
// @ts-ignore
import path from "path";
import os from "os";
import { AuditCheck } from '../auditTypes';

// @ts-ignore
function getDiskInfo(): { total: number; free: number; used: number; percent: number } {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      total,
      free,
      used: total - free,
      percent: Math.round(((total - free) / total) * 100),
    };
  } catch {
    return { total: 0, free: 0, used: 0, percent: 0 };
  }
}

export function getDependenciesChecks(
  // @ts-ignore
  dbManager: DatabaseManager,
  // @ts-ignore
  logger: Logger,
  // @ts-ignore
  auditLogger: AuditLogger,
  // @ts-ignore
  config: any
): AuditCheck[] {
  return [
    {
      id: "dep-node-version",
      name: "Node.js Version",
      category: "dependencies",
      severity: "warning",
      description: "Check Node.js version compatibility",
      run: async () => {
        const start = Date.now();
        const version = process.version;
        const major = parseInt(version.slice(1).split(".")[0]);
        const status = major < 18 ? "fail" : major < 20 ? "warn" : "pass";
        return {
          passed: status === "pass",
          status,
          message: `Node.js: ${version}`,
          details: { majorVersion: major },
          remediation: status !== "pass" ? "Upgrade to Node.js 20+" : undefined,
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "dep-electron-version",
      name: "Electron Version",
      category: "dependencies",
      severity: "info",
      description: "Check Electron version",
      run: async () => {
        const start = Date.now();
        const electronVersion = process.versions.electron || "not detected";
        return {
          passed: true,
          status: "pass" as const,
          message: `Electron: ${electronVersion}`,
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "dep-sqlite",
      name: "SQLite Extension",
      category: "dependencies",
      severity: "critical",
      description: "Verify better-sqlite3-multiple-ciphers is working",
      run: async () => {
        const start = Date.now();
        try {
          const result = dbManager.get<{ sqlite_version: string }>(
            "SELECT sqlite_version() as sqlite_version"
          );
          return {
            passed: true,
            status: "pass" as const,
            message: `SQLite: ${result?.sqlite_version}`,
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `SQLite extension failed: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    }
  ];
}
