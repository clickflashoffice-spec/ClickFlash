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

export function getPerformanceChecks(
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
      id: "perf-memory",
      name: "Memory Usage",
      category: "performance",
      severity: "warning",
      description: "Check current memory usage",
      run: async () => {
        const start = Date.now();
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const percent = Math.round((used / total) * 100);
        const status = percent > 90 ? "fail" : percent > 75 ? "warn" : "pass";
        return {
          passed: status === "pass",
          status,
          message: `Memory: ${percent}% used (${Math.round(used / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB)`,
          details: { usedPercent: percent },
          remediation: status !== "pass" ? "Close unused applications" : undefined,
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "perf-cpu",
      name: "CPU Load",
      category: "performance",
      severity: "info",
      description: "Check CPU load average",
      run: async () => {
        const start = Date.now();
        const load = os.loadavg();
        const cpus = os.cpus().length;
        const loadPercent = Math.round((load[0] / cpus) * 100);
        return {
          passed: true,
          status: "pass" as const,
          message: `CPU load: ${loadPercent}% (1m: ${load[0].toFixed(2)}, 5m: ${load[1].toFixed(2)})`,
          details: { loadAvg: load, cpus },
          duration: Date.now() - start,
        };
      },
    },
    {
      id: "perf-uptime",
      name: "System Uptime",
      category: "performance",
      severity: "info",
      description: "Check system uptime",
      run: async () => {
        const start = Date.now();
        const uptime = os.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        return {
          passed: true,
          status: "pass" as const,
          message: `System uptime: ${days}d ${hours}h`,
          duration: Date.now() - start,
        };
      },
    }
  ];
}
