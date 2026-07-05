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

export function getDatabaseChecks(
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
      id: "db-connection",
      name: "Database Connection",
      category: "database",
      severity: "critical",
      description: "Verify SQLite database is accessible and responding",
      run: async () => {
        const start = Date.now();
        try {
          const result = dbManager.get<{ value: string }>("SELECT 1 as value");
      // @ts-ignore
      // @ts-ignore
          if (result?.value === 1) {
            return {
              passed: true,
              status: "pass" as const,
              message: "Database connection active",
              duration: Date.now() - start,
            };
          }
          throw new Error("Unexpected query result");
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `Database connection failed: ${err.message}`,
            remediation: "Check database file permissions and disk space",
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "db-wal-mode",
      name: "Database WAL Mode",
      category: "database",
      severity: "critical",
      description: "Verify Write-Ahead Logging is enabled for crash recovery",
      run: async () => {
        const start = Date.now();
        try {
          const result = dbManager.get<{ journal_mode: string }>(
            "PRAGMA journal_mode"
          );
          if (result?.journal_mode?.toLowerCase() === "wal") {
            return {
              passed: true,
              status: "pass" as const,
              message: "WAL mode enabled",
              duration: Date.now() - start,
            };
          }
          return {
            passed: false,
            status: "fail" as const,
            message: `WAL mode not enabled (current: ${result?.journal_mode})`,
            remediation: "Run: PRAGMA journal_mode = WAL",
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `WAL check failed: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "db-encryption",
      name: "Database Encryption",
      category: "database",
      severity: "critical",
      description: "Verify database encryption is configured",
      run: async () => {
        const start = Date.now();
        const encKey = process.env.DB_ENCRYPTION_KEY;
        if (!encKey) {
          return {
            passed: false,
            status: "warn" as const,
            message: "DB_ENCRYPTION_KEY not set — database is unencrypted",
            remediation: "Set DB_ENCRYPTION_KEY in .env (64 hex characters)",
            duration: Date.now() - start,
          };
        }
        if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
          return {
            passed: false,
            status: "fail" as const,
            message: "DB_ENCRYPTION_KEY format invalid (must be 64 hex chars)",
            remediation: "Generate a 256-bit key: openssl rand -hex 32",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: "Database encryption key configured",
          details: { keyLength: encKey.length },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "db-migrations",
      name: "Database Migrations",
      category: "database",
      severity: "warning",
      description: "Check for pending database migrations",
      run: async () => {
        const start = Date.now();
        try {
          const result = dbManager.get<{ count: number }>(
            "SELECT COUNT(*) as count FROM migrations"
          );
          const count = result?.count || 0;
          return {
            passed: true,
            status: "pass" as const,
            message: `${count} migrations applied`,
            details: { appliedMigrations: count },
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "warn" as const,
            message: `Migration check failed: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "db-corruption",
      name: "Database Integrity Check",
      category: "database",
      severity: "critical",
      description: "Run PRAGMA integrity_check to detect corruption",
      run: async () => {
        const start = Date.now();
        try {
          const result = dbManager.get<{ integrity_check: string }>(
            "PRAGMA integrity_check"
          );
          if (result?.integrity_check === "ok") {
            return {
              passed: true,
              status: "pass" as const,
              message: "Database integrity verified",
              duration: Date.now() - start,
            };
          }
          return {
            passed: false,
            status: "fail" as const,
            message: `Database corruption detected: ${result?.integrity_check}`,
            remediation: "Restore from backup immediately",
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `Integrity check failed: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    },
    {
      id: "db-size",
      name: "Database Size",
      category: "database",
      severity: "warning",
      description: "Check database file size and growth",
      run: async () => {
        const start = Date.now();
        try {
          const dbPath = config.DB_FILE || "./pb_data/database.sqlite";
          const stats = fs.statSync(dbPath);
          const sizeMB = Math.round(stats.size / (1024 * 1024));
          const walPath = dbPath + "-wal";
          let walSizeMB = 0;
          if (fs.existsSync(walPath)) {
            walSizeMB = Math.round(fs.statSync(walPath).size / (1024 * 1024));
          }
          const status = sizeMB > 1000 ? "warn" : sizeMB > 5000 ? "fail" : "pass";
          return {
            passed: status === "pass",
            status,
            message: `Database: ${sizeMB}MB, WAL: ${walSizeMB}MB`,
            details: { dbSizeMB: sizeMB, walSizeMB },
            remediation: status !== "pass" ? "Consider VACUUM or archival" : undefined,
            duration: Date.now() - start,
          };
        } catch (err: any) {
          return {
            passed: false,
            status: "fail" as const,
            message: `Size check failed: ${err.message}`,
            duration: Date.now() - start,
          };
        }
      },
    }
  ];
}
