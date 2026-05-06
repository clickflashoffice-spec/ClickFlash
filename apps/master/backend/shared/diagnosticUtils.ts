import os from "os";
import { NetworkMonitor } from "../services/NetworkMonitor";

export interface DiagnosticSnapshot {
  system: {
    platform: string;
    arch: string;
    uptime: number;
    loadAvg: number[];
    memory: {
      freeMB: number;
      totalMB: number;
      usagePercent: number;
    };
  };
  network?: {
    avgLatency: number;
    errorRate: number;
    successRate: number;
    eventCount: number;
  };
  process: {
    pid: number;
    heapUsedMB: number;
    heapTotalMB: number;
    uptime: number;
  };
  timestamp: string;
}

/**
 * Generates a comprehensive diagnostic snapshot of the system state.
 * Optimized for Sentry context attachment (serializable and compact).
 */
export function getDiagnosticSnapshot(networkMonitor?: NetworkMonitor): DiagnosticSnapshot {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = process.memoryUsage();

  return {
    system: {
      platform: os.platform(),
      arch: os.arch(),
      uptime: Math.round(os.uptime()),
      loadAvg: os.loadavg().map(l => +l.toFixed(2)),
      memory: {
        freeMB: +(freeMem / 1_048_576).toFixed(2),
        totalMB: +(totalMem / 1_048_576).toFixed(2),
        usagePercent: +((1 - freeMem / totalMem) * 100).toFixed(1),
      },
    },
    network: networkMonitor ? {
      ...networkMonitor.getStats(),
    } : undefined,
    process: {
      pid: process.pid,
      heapUsedMB: +(memUsage.heapUsed / 1_048_576).toFixed(2),
      heapTotalMB: +(memUsage.heapTotal / 1_048_576).toFixed(2),
      uptime: Math.round(process.uptime()),
    },
    timestamp: new Date().toISOString(),
  };
}
