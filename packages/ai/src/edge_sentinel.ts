import { AgentTools } from './AgentTools.js';

export interface SentinelStatus {
  isRunning: boolean;
  lastCheckTimestamp: string | null;
  totalChecksRun: number;
  anomaliesDetected: number;
  remediationsTriggered: number;
  lastQueueSnapshot: Record<string, unknown> | null;
}

/**
 * ClickFlash Edge Sentinel Daemon
 * Background monitoring and autonomous self-healing service for Edge Master OS and Touch Kiosks.
 */
export class EdgeSentinel {
  private intervalMs: number;
  private timer: any = null;
  private isRunning: boolean = false;
  private totalChecks: number = 0;
  private anomalies: number = 0;
  private remediations: number = 0;
  private lastSnapshot: Record<string, unknown> | null = null;
  private lastTimestamp: string | null = null;

  constructor(intervalMs: number = 30000) {
    this.intervalMs = intervalMs;
  }

  /**
   * Starts the autonomous health sentinel loop.
   */
  start(onAnomaly?: (anomaly: string) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.checkHealth(onAnomaly);
    this.timer = setInterval(() => {
      this.checkHealth(onAnomaly);
    }, this.intervalMs);
  }

  /**
   * Stops the sentinel daemon.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Performs a single atomic health inspection.
   */
  async checkHealth(onAnomaly?: (anomaly: string) => void): Promise<boolean> {
    this.totalChecks++;
    this.lastTimestamp = new Date().toISOString();

    try {
      const queueHealthRaw = await AgentTools.getQueueHealth();
      let healthData: any = {};
      try {
        healthData = JSON.parse(queueHealthRaw);
      } catch {
        healthData = { raw: queueHealthRaw };
      }

      this.lastSnapshot = healthData;

      // Detect anomalies (e.g. failed status rows or excessive retries)
      if (Array.isArray(healthData.data)) {
        for (const row of healthData.data) {
          if (row.status === 'failed' || (row.avg_retries && row.avg_retries > 3)) {
            this.anomalies++;
            const msg = `[Edge Sentinel] Detected stuck/failed queue records (status: ${row.status}, avg_retries: ${row.avg_retries || 0})`;
            if (onAnomaly) onAnomaly(msg);
            this.triggerRemediation(row);
            return false;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Autonomous remediation strategy for stuck writes.
   */
  private triggerRemediation(row: any): void {
    this.remediations++;
    // Log remediation action - in full production, resets retry_count or flags circuit breaker
  }

  /**
   * Returns the current diagnostic state of the sentinel.
   */
  getStatus(): SentinelStatus {
    return {
      isRunning: this.isRunning,
      lastCheckTimestamp: this.lastTimestamp,
      totalChecksRun: this.totalChecks,
      anomaliesDetected: this.anomalies,
      remediationsTriggered: this.remediations,
      lastQueueSnapshot: this.lastSnapshot
    };
  }
}
