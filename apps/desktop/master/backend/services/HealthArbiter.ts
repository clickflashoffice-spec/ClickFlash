import { DatabaseManager } from '../database/db';
import { Logger } from '../utils/logger';
import si from "systeminformation";
import { RecyclerService } from "./RecyclerService";
import { HardwareHealthStatus } from '@clickflash/types';
import { dslrTetherService } from './dslrTetherService';
import { HardwareService } from './HardwareService';
import { randomUUID } from 'crypto';

/**
 * Phase 15: HealthArbiter
 * Singleton runtime watchdog that continuously evaluates system health
 * and coordinates service degradation when resource thresholds are breached.
 */

export type SystemState = "NOMINAL" | "DEGRADED" | "CRITICAL";

export interface HealthSnapshot {
  state: SystemState;
  timestamp: string;
  reasons: string[];
  metrics: {
    diskUsedPercent: number;
    diskFreeGb: number;
    memoryUsedPercent: number;
    dbResponsive: boolean;
    thermalStatus: string;
  };
}

interface HealthThresholds {
  diskWarnPercent: number;
  diskCriticalPercent: number;
  minFreeGb: number;
  pollIntervalMs: number;
  autoRecovery: boolean;
}

export class HealthArbiter {
  private static instance: HealthArbiter | null = null;

  private currentState: SystemState = "NOMINAL";
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private thresholds: HealthThresholds;
  private lastSnapshot: HealthSnapshot | null = null;
  private recycler: RecyclerService;
  private sseCallback: ((event: string, data: any) => void) | null = null;

  private hardwareService: HardwareService | null = null;

  constructor(
    private dbManager: DatabaseManager,
    private logger: Logger,
  ) {
    this.recycler = new RecyclerService(dbManager, logger);
    this.thresholds = this.loadThresholds();
  }

  public setHardwareService(hwService: HardwareService) {
    this.hardwareService = hwService;
  }

  public static getInstance(dbManager: DatabaseManager, logger: Logger): HealthArbiter {
    if (!HealthArbiter.instance) {
      HealthArbiter.instance = new HealthArbiter(dbManager, logger);
    }
    return HealthArbiter.instance;
  }

  /**
   * Start continuous health monitoring.
   */
  public start() {
    this.logger.info("[HealthArbiter] Starting runtime health monitoring", {
      interval: `${this.thresholds.pollIntervalMs}ms`,
      autoRecovery: this.thresholds.autoRecovery,
    });

    // Initial check
    this.evaluate();

    this.pollTimer = setInterval(
      () => this.evaluate(),
      this.thresholds.pollIntervalMs
    );
  }

  public stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Register SSE broadcast callback for real-time state pushes.
   */
  public onStateChange(callback: (event: string, data: any) => void) {
    this.sseCallback = callback;
  }

  /**
   * Current system state — used by route guards.
   */
  public getState(): SystemState {
    return this.currentState;
  }

  /**
   * Full health snapshot for dashboard consumption.
   */
  public getSnapshot(): HealthSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Recent health log entries for the dashboard timeline.
   */
  public getRecentTransitions(limit: number = 50): any[] {
    try {
      return this.dbManager.query<any>(
        "SELECT * FROM system_health_log ORDER BY timestamp DESC LIMIT ?",
        [limit]
      );
    } catch {
      return [];
    }
  }

  // ── Core Evaluation Loop ──────────────────────────────────────────────

  private async evaluate() {
    const reasons: string[] = [];
    let newState: SystemState = "NOMINAL";

    // 1. Disk check
    try {
      const fsStats = await si.fsSize();
      const disk = fsStats[0];
      if (disk) {
        const freeGb = disk.available / (1024 ** 3);
        const usedPercent = disk.use;

        if (usedPercent > this.thresholds.diskCriticalPercent || freeGb < this.thresholds.minFreeGb) {
          reasons.push(`Disk critical: ${usedPercent.toFixed(1)}% used, ${freeGb.toFixed(1)}GB free`);
          newState = "CRITICAL";
        } else if (usedPercent > this.thresholds.diskWarnPercent) {
          reasons.push(`Disk pressure: ${usedPercent.toFixed(1)}% used`);
          newState = "DEGRADED";
        }

        // Update snapshot metrics
        this.lastSnapshot = {
          state: newState,
          timestamp: new Date().toISOString(),
          reasons,
          metrics: {
            diskUsedPercent: usedPercent,
            diskFreeGb: freeGb,
            memoryUsedPercent: 0,
            dbResponsive: true,
            thermalStatus: "NOMINAL",
          },
        };
      }
    } catch (error: any) {
      reasons.push(`Disk metrics unavailable: ${error.message}`);
      if (newState !== "CRITICAL") newState = "DEGRADED";
    }

    // 2. Memory check
    try {
      const mem = await si.mem();
      const memPercent = ((mem.used / mem.total) * 100);
      if (this.lastSnapshot) {
        this.lastSnapshot.metrics.memoryUsedPercent = memPercent;
      }
      if (memPercent > 95) {
        reasons.push(`Memory critical: ${memPercent.toFixed(1)}% used`);
        if (newState !== "CRITICAL") newState = "DEGRADED";
      }
    } catch { /* non-fatal */ }

    // 3. Database responsiveness
    try {
      const start = Date.now();
      this.dbManager.get<{ one: number }>("SELECT 1 as one");
      const latency = Date.now() - start;
      if (latency > 5000) {
        reasons.push(`Database slow: ${latency}ms response`);
        if (newState !== "CRITICAL") newState = "DEGRADED";
      }
      if (this.lastSnapshot) {
        this.lastSnapshot.metrics.dbResponsive = latency < 5000;
      }
    } catch (error: any) {
      reasons.push(`Database unresponsive: ${error.message}`);
      newState = "CRITICAL";
      if (this.lastSnapshot) {
        this.lastSnapshot.metrics.dbResponsive = false;
      }
    }

    // Update snapshot
    if (this.lastSnapshot) {
      this.lastSnapshot.state = newState;
      this.lastSnapshot.reasons = reasons;
      this.lastSnapshot.timestamp = new Date().toISOString();
    }

    // HardwareHealthStatus / Tamper evaluation
    const clockAltered = this.hardwareService ? this.hardwareService.hasClockAltered() : false;
    const sdCardRemovedDuringShift = dslrTetherService.hasSdCardRemoved();

    let hardwareState: 'healthy' | 'degraded' | 'critical' | 'offline' = newState === "NOMINAL" ? 'healthy' : newState === 'DEGRADED' ? 'degraded' : 'critical';
    if (clockAltered || sdCardRemovedDuringShift) {
        hardwareState = 'critical';
    }

    const hwStatus: HardwareHealthStatus = {
        id: randomUUID(),
        deviceId: 'MASTER_NODE',
        status: hardwareState,
        tamperFlags: {
            sdCardRemovedDuringShift,
            clockAltered,
            gpsSpoofed: false,
            unauthorizedUsb: false
        },
        metrics: {
            diskSpace: this.lastSnapshot?.metrics.diskFreeGb,
            cpuTemp: undefined, // Requires privileged sensors
            batteryLevel: undefined
        },
        lastCheckinAt: new Date().toISOString()
    };

    if (this.sseCallback) {
        this.sseCallback("HARDWARE_HEALTH", hwStatus);
    }

    // State transition handling
    if (newState !== this.currentState) {
      this.handleTransition(this.currentState, newState, reasons);
    }

    this.currentState = newState;
  }

  // ── State Machine ─────────────────────────────────────────────────────

  private handleTransition(from: SystemState, to: SystemState, reasons: string[]) {
    const eventType = to === "NOMINAL" ? "RECOVERED" : to;

    this.logger.warn(`[HealthArbiter] State transition: ${from} -> ${to}`, {
      reasons,
    });

    // Persist transition
    try {
      const verdict = to === "NOMINAL" ? "READY" : to === "DEGRADED" ? "DEGRADED" : "FATAL";
      this.dbManager.run(
        `INSERT INTO system_health_log (timestamp, event_type, verdict, probes_json, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [
          new Date().toISOString(),
          eventType,
          verdict,
          JSON.stringify(this.lastSnapshot?.metrics || {}),
          JSON.stringify({ from, to, reasons }),
        ]
      );
    } catch (error: any) {
      this.logger.error("[HealthArbiter] Failed to log transition", { error: error.message });
    }

    // Broadcast via SSE
    if (this.sseCallback) {
      this.sseCallback("SYSTEM_HEALTH", {
        state: to,
        previousState: from,
        reasons,
        timestamp: new Date().toISOString(),
      });
    }

    // Auto-recovery actions
    if (this.thresholds.autoRecovery && to === "CRITICAL") {
      this.logger.warn("[HealthArbiter] Auto-recovery: Triggering emergency RecyclerService scrub");
      this.recycler.scrub().catch((err: Error) => {
        this.logger.error("[HealthArbiter] Emergency scrub failed", { error: err.message });
      });
    }
  }

  // ── Configuration ─────────────────────────────────────────────────────

  private loadThresholds(): HealthThresholds {
    const fetch = (key: string, def: string): string => {
      try {
        const row = this.dbManager.get<{ value: string }>(
          "SELECT value FROM settings WHERE key = ?", [key]
        );
        return row?.value || def;
      } catch {
        return def;
      }
    };

    return {
      diskWarnPercent: parseFloat(fetch("health_disk_warn_percent", "90")),
      diskCriticalPercent: parseFloat(fetch("health_disk_critical_percent", "95")),
      minFreeGb: parseFloat(fetch("health_min_free_gb", "1")),
      pollIntervalMs: parseInt(fetch("health_poll_interval_ms", "30000")),
      autoRecovery: fetch("health_auto_recovery", "true") === "true",
    };
  }
}
