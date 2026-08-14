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

export function getFilesystemChecks(
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
      id: "fs-data-dir",
      name: "Data Directory",
      category: "filesystem",
      severity: "critical",
      description: "Verify data directory exists and is writable",
      run: async () => {
        const start = Date.now();
        const dataDir = config.DATA_DIR || "./pb_data";
        try {
          fs.accessSync(dataDir, fs.constants.W_OK);
          return {
            passed: true,
            status: "pass" as const,
            message: `Data directory writable: ${dataDir}`,
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `Data directory not writable: ${err.message}`,
            remediation: "Check directory permissions",
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "fs-upload-dir",
      name: "Upload Directory",
      category: "filesystem",
      severity: "critical",
      description: "Verify upload directory exists and is writable",
      run: async () => {
        const start = Date.now();
        const uploadDir = config.UPLOAD_DIR || "./uploads";
        try {
          fs.accessSync(uploadDir, fs.constants.W_OK);
          const stats = fs.statSync(uploadDir);
          return {
            passed: true,
            status: "pass" as const,
            message: `Upload directory ready`,
            details: { path: uploadDir, size: Math.round(stats.size / 1024) + "KB" },
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `Upload directory issue: ${err.message}`,
            remediation: "Create directory and set permissions",
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "fs-backup-dir",
      name: "Backup Directory",
      category: "filesystem",
      severity: "warning",
      description: "Verify backup directory exists",
      run: async () => {
        const start = Date.now();
        const backupDir = config.BACKUP_DIR || "./backups";
        if (!fs.existsSync(backupDir)) {
          return {
            passed: false,
            status: "warn" as const,
            message: "Backup directory does not exist",
            remediation: "Create backup directory or run backup setup",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: "Backup directory exists",
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "fs-disk-space",
      name: "Disk Space",
      category: "filesystem",
      severity: "critical",
      description: "Check available disk space",
      run: async () => {
        const start = Date.now();
        const disk = getDiskInfo();
        if (disk.percent > 95) {
          return {
            passed: false,
            status: "fail" as const,
            message: `Critical disk usage: ${disk.percent}%`,
            details: { free: Math.round(disk.free / 1024 / 1024) + "MB" },
            remediation: "Free disk space immediately",
            duration: Date.now() - start,
          };
        }
        if (disk.percent > 80) {
          return {
            passed: false,
            status: "warn" as const,
            message: `High disk usage: ${disk.percent}%`,
            details: { free: Math.round(disk.free / 1024 / 1024) + "MB" },
            remediation: "Consider cleanup or expansion",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: `Disk usage: ${disk.percent}%`,
          details: { free: Math.round(disk.free / 1024 / 1024) + "MB" },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "fs-logs-dir",
      name: "Logs Directory",
      category: "filesystem",
      severity: "warning",
      description: "Verify logs directory is writable",
      run: async () => {
        const start = Date.now();
        const logsDir = config.LOGS_DIR || "./logs";
        try {
          fs.accessSync(logsDir, fs.constants.W_OK);
          return {
            passed: true,
            status: "pass" as const,
            message: "Logs directory writable",
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "warn" as const,
            message: `Logs directory issue: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    }
  ];
}
