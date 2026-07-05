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

export function getBackupChecks(
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
      id: "bkp-recent",
      name: "Recent Backup",
      category: "backup",
      severity: "warning",
      description: "Check for recent database backup",
      run: async () => {
        const start = Date.now();
        const backupDir = config.BACKUP_DIR || "./backups";
        if (!fs.existsSync(backupDir)) {
          return {
            passed: false,
            status: "warn" as const,
            message: "No backup directory found",
            remediation: "Run backup setup or create directory",
            duration: Date.now() - start,
          };
        }
        const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".db"));
        if (files.length === 0) {
          return {
            passed: false,
            status: "warn" as const,
            message: "No backup files found",
            remediation: "Run manual backup or enable automatic backups",
            duration: Date.now() - start,
          };
        }
        const latest = files
          .map((f) => ({
            name: f,
            time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.time - a.time)[0];
        const ageDays = Math.round((Date.now() - latest.time) / (1000 * 60 * 60 * 24));
        const status = ageDays > 7 ? "warn" : "pass";
        return {
          passed: status === "pass",
          status,
          message: `Latest backup: ${latest.name} (${ageDays} days ago)`,
          details: { latestBackup: latest.name, ageDays },
          remediation: status === "warn" ? "Run backup — last backup is over 7 days old" : undefined,
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "bkp-automatic",
      name: "Automatic Backups",
      category: "backup",
      severity: "info",
      description: "Check if automatic backups are configured",
      run: async () => {
        const start = Date.now();
        const autoBackup = process.env.AUTO_BACKUP === "true";
        return {
          passed: autoBackup,
          status: autoBackup ? "pass" : "warn" as const,
          message: autoBackup ? "Automatic backups enabled" : "Automatic backups disabled",
          remediation: autoBackup ? undefined : "Set AUTO_BACKUP=true in .env",
          duration: Date.now() - start,
        };
      },
    }
  ];
}
