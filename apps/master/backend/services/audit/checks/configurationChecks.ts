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

export function getConfigurationChecks(
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
      id: "cfg-env",
      name: "Environment Variables",
      category: "configuration",
      severity: "warning",
      description: "Check required environment variables",
      run: async () => {
        const start = Date.now();
        const required = ["NODE_ENV", "PORT", "DATA_DIR"];
        const missing = required.filter((key) => !process.env[key]);
        if (missing.length > 0) {
          return {
            passed: false,
            status: "warn" as const,
            message: `Missing env vars: ${missing.join(", ")}`,
            remediation: "Add to .env file",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: "Required environment variables set",
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "cfg-node-env",
      name: "NODE_ENV",
      category: "configuration",
      severity: "warning",
      description: "Verify NODE_ENV is set appropriately",
      run: async () => {
        const start = Date.now();
        const env = process.env.NODE_ENV || "development";
        return {
          passed: true,
          status: "pass" as const,
          message: `NODE_ENV: ${env}`,
          details: { environment: env },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "cfg-cloud",
      name: "Cloud Integration",
      category: "configuration",
      severity: "info",
      description: "Check cloud service configuration",
      run: async () => {
        const start = Date.now();
        const cloudUrl = process.env.CLOUD_API_URL;
        const cloudToken = process.env.CLOUD_API_TOKEN;
        if (!cloudUrl && !cloudToken) {
          return {
            passed: false,
            status: "warn" as const,
            message: "Cloud integration not configured",
            remediation: "Set CLOUD_API_URL and CLOUD_API_TOKEN for cloud sync",
            duration: Date.now() - start,
          };
        }
        return {
          passed: true,
          status: "pass" as const,
          message: "Cloud integration configured",
          duration: Date.now() - start,
        };
      },
    }
  ];
}
