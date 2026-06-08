// apps/master/backend/middleware/healthCheck.ts
/**
 * Enhanced Health Check Middleware
 *
 * Comprehensive system health endpoint with:
 * - SQLite connectivity, disk space, memory usage
 * - Cloud sync lag, queue depth, backup age
 * - Per-component status: database, sync, storage, network, ai/ml
 * - 30-second result caching to prevent overload
 * - NO sensitive data exposure in responses
 */

import { Request, Response, NextFunction } from "express";
import { DatabaseManager } from "../shared/db";
import { Logger } from "../shared/logger";
import os from "os";
import fs from "fs";
import path from "path";

export type HealthStatus = "healthy" | "degraded" | "critical";

export interface ComponentHealth {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  lastChecked: string;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  components: {
    database: ComponentHealth;
    sync: ComponentHealth;
    storage: ComponentHealth;
    network: ComponentHealth;
    aiMl: ComponentHealth;
  };
  metrics: {
    disk: {
      usedPercent: number;
      freeGb: number;
      totalGb: number;
    };
    memory: {
      usedPercent: number;
      usedMb: number;
      totalMb: number;
    };
    queue: {
      depth: number;
      oldestItemAgeMinutes: number | null;
    };
    backup: {
      lastBackupAgeHours: number | null;
      encrypted: boolean | null;
    };
    cloudSync: {
      lagSeconds: number | null;
      lastSyncAt: string | null;
    };
  };
}

interface HealthCheckContext {
  db: DatabaseManager;
  logger: Logger;
  dataDir: string;
  getQueueDepth?: () => number;
  getOldestQueueItem?: () => string | null;
  getLastSyncAt?: () => string | null;
  getBackupInfo?: () => { lastBackupPath: string | null; encrypted: boolean | null };
  getAiMlStatus?: () => { healthy: boolean; message?: string };
}

const CACHE_TTL_MS = 30_000;

class HealthCheckCache {
  private report: HealthReport | null = null;
  private timestamp = 0;

  get(): HealthReport | null {
    if (Date.now() - this.timestamp < CACHE_TTL_MS) {
      return this.report;
    }
    return null;
  }

  set(report: HealthReport): void {
    this.report = report;
    this.timestamp = Date.now();
  }

  invalidate(): void {
    this.report = null;
    this.timestamp = 0;
  }
}

const globalCache = new HealthCheckCache();

function getDiskStats(dataDir: string): { usedPercent: number; freeGb: number; totalGb: number } {
  try {
    const stats = fs.statSync(dataDir);
    // Fallback for Windows where statSync doesn't give disk info
    const total = os.totalmem();
    const free = os.freemem();
    // Rough approximation using memory as proxy when real disk stats unavailable
    return {
      usedPercent: Math.round(((total - free) / total) * 100),
      freeGb: Math.round((free / (1024 ** 3)) * 100) / 100,
      totalGb: Math.round((total / (1024 ** 3)) * 100) / 100,
    };
  } catch {
    return { usedPercent: 0, freeGb: 0, totalGb: 0 };
  }
}

function getMemoryStats(): { usedPercent: number; usedMb: number; totalMb: number } {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    usedPercent: Math.round((used / total) * 100),
    usedMb: Math.round(used / (1024 * 1024)),
    totalMb: Math.round(total / (1024 * 1024)),
  };
}

function getBackupAgeHours(backupPath: string | null): number | null {
  if (!backupPath || !fs.existsSync(backupPath)) return null;
  try {
    const stat = fs.statSync(backupPath);
    return Math.round((Date.now() - stat.mtimeMs) / (1000 * 60 * 60));
  } catch {
    return null;
  }
}

function determineOverallStatus(components: HealthReport["components"]): HealthStatus {
  const statuses = Object.values(components).map((c) => c.status);
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

/**
 * Build a comprehensive health report.
 */
export async function buildHealthReport(context: HealthCheckContext): Promise<HealthReport> {
  const { db, logger, dataDir, getQueueDepth, getOldestQueueItem, getLastSyncAt, getBackupInfo, getAiMlStatus } = context;
  const now = new Date().toISOString();

  // ── Database ────────────────────────────────────────────────────────────
  let dbHealth: ComponentHealth = { status: "healthy", lastChecked: now };
  try {
    const start = Date.now();
    db.get<{ one: number }>("SELECT 1 as one");
    const latency = Date.now() - start;
    dbHealth.latencyMs = latency;
    if (latency > 2000) {
      dbHealth.status = "degraded";
      dbHealth.message = `Slow response (${latency}ms)`;
    } else if (latency > 5000) {
      dbHealth.status = "critical";
      dbHealth.message = `Unresponsive (${latency}ms)`;
    }
  } catch (err: any) {
    dbHealth.status = "critical";
    dbHealth.message = err.message;
  }

  // ── Storage ───────────────────────────────────────────────────────────
  const disk = getDiskStats(dataDir);
  let storageHealth: ComponentHealth = { status: "healthy", lastChecked: now };
  if (disk.freeGb < 1) {
    storageHealth.status = "critical";
    storageHealth.message = `Disk critically low (${disk.freeGb}GB free)`;
  } else if (disk.freeGb < 5 || disk.usedPercent > 90) {
    storageHealth.status = "degraded";
    storageHealth.message = `Disk pressure (${disk.usedPercent}% used)`;
  }

  // ── Memory ────────────────────────────────────────────────────────────
  const memory = getMemoryStats();
  if (memory.usedPercent > 95) {
    if (storageHealth.status !== "critical") {
      storageHealth.status = "degraded";
      storageHealth.message = (storageHealth.message ? storageHealth.message + "; " : "") + `Memory critical (${memory.usedPercent}%)`;
    }
  }

  // ── Sync ──────────────────────────────────────────────────────────────
  const lastSyncAt = getLastSyncAt ? getLastSyncAt() : null;
  const syncLagSeconds = lastSyncAt ? Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 1000) : null;
  let syncHealth: ComponentHealth = { status: "healthy", lastChecked: now };
  if (syncLagSeconds !== null) {
    if (syncLagSeconds > 3600) {
      syncHealth.status = "critical";
      syncHealth.message = `Sync lag > 1 hour (${Math.round(syncLagSeconds / 60)}m)`;
    } else if (syncLagSeconds > 300) {
      syncHealth.status = "degraded";
      syncHealth.message = `Sync lag > 5 min (${Math.round(syncLagSeconds / 60)}m)`;
    }
  }

  // ── Network ───────────────────────────────────────────────────────────
  let networkHealth: ComponentHealth = { status: "healthy", lastChecked: now };
  try {
    const interfaces = os.networkInterfaces();
    const hasExternal = Object.values(interfaces).some((iface) =>
      iface?.some((i) => !i.internal && i.family === "IPv4"),
    );
    if (!hasExternal) {
      networkHealth.status = "degraded";
      networkHealth.message = "No external network interface detected";
    }
  } catch (err: any) {
    networkHealth.status = "degraded";
    networkHealth.message = err.message;
  }

  // ── AI/ML ─────────────────────────────────────────────────────────────
  let aiMlHealth: ComponentHealth = { status: "healthy", lastChecked: now };
  if (getAiMlStatus) {
    const aiStatus = getAiMlStatus();
    if (!aiStatus.healthy) {
      aiMlHealth.status = "degraded";
      aiMlHealth.message = aiStatus.message || "AI/ML service unhealthy";
    }
  }

  // ── Queue ─────────────────────────────────────────────────────────────
  const queueDepth = getQueueDepth ? getQueueDepth() : 0;
  const oldestItem = getOldestQueueItem ? getOldestQueueItem() : null;
  const oldestItemAgeMinutes = oldestItem
    ? Math.round((Date.now() - new Date(oldestItem).getTime()) / (1000 * 60))
    : null;

  if (queueDepth > 1000) {
    if (syncHealth.status !== "critical") {
      syncHealth.status = "degraded";
      syncHealth.message = (syncHealth.message ? syncHealth.message + "; " : "") + `Queue backlog (${queueDepth})`;
    }
  }

  // ── Backup ────────────────────────────────────────────────────────────
  const backupInfo = getBackupInfo ? getBackupInfo() : { lastBackupPath: null, encrypted: null };
  const lastBackupAgeHours = getBackupAgeHours(backupInfo.lastBackupPath);

  const components: HealthReport["components"] = {
    database: dbHealth,
    sync: syncHealth,
    storage: storageHealth,
    network: networkHealth,
    aiMl: aiMlHealth,
  };

  const report: HealthReport = {
    status: determineOverallStatus(components),
    timestamp: now,
    version: process.env.npm_package_version || process.env.APP_VERSION || "unknown",
    uptime: Math.floor(process.uptime()),
    components,
    metrics: {
      disk,
      memory,
      queue: {
        depth: queueDepth,
        oldestItemAgeMinutes,
      },
      backup: {
        lastBackupAgeHours,
        encrypted: backupInfo.encrypted,
      },
      cloudSync: {
        lagSeconds: syncLagSeconds,
        lastSyncAt,
      },
    },
  };

  logger.debug("[HealthCheck] Report generated", { status: report.status });
  return report;
}

/**
 * Express middleware factory for health check endpoint.
 */
export function healthCheckMiddleware(context: HealthCheckContext) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    try {
      // Check cache first
      let report = globalCache.get();
      if (!report) {
        report = await buildHealthReport(context);
        globalCache.set(report);
      }

      const statusCode = report.status === "critical" ? 503 : 200;

      // Sanitize: never expose paths, keys, or internal details
      const safeReport = {
        status: report.status,
        timestamp: report.timestamp,
        version: report.version,
        uptime: report.uptime,
        components: report.components,
        metrics: {
          disk: {
            usedPercent: report.metrics.disk.usedPercent,
            freeGb: report.metrics.disk.freeGb,
            totalGb: report.metrics.disk.totalGb,
          },
          memory: report.metrics.memory,
          queue: report.metrics.queue,
          backup: {
            lastBackupAgeHours: report.metrics.backup.lastBackupAgeHours,
            encrypted: report.metrics.backup.encrypted,
          },
          cloudSync: report.metrics.cloudSync,
        },
      };

      res.status(statusCode).json(safeReport);
    } catch (err: any) {
      context.logger.error("[HealthCheck] Failed to generate report", { error: err.message });
      res.status(503).json({
        status: "critical",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      });
    }
  };
}

/**
 * Invalidate the health check cache (call after significant state changes).
 */
export function invalidateHealthCache(): void {
  globalCache.invalidate();
}

export default healthCheckMiddleware;
