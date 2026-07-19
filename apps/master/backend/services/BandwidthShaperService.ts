import { Logger } from '../utils/logger';
import { NetworkMonitor } from './NetworkMonitor';

export interface BandwidthThrottleConfig {
  isThrottled: boolean;
  maxUploadRateKbps: number;
  delayBetweenChunksMs: number;
  reason: string;
}

export interface BandwidthShaperMetrics {
  currentStatus: 'IDLE' | 'NORMAL' | 'THROTTLED' | 'HEAVY_THROTTLE';
  activeKioskSessions: number;
  currentNetworkThroughputMbps: number;
  throttleConfig: BandwidthThrottleConfig;
  totalThrottledEvents: number;
}

/**
 * Dynamic Bandwidth Shaping Service (7.2.3)
 * Automatically monitors active touchscreen kiosk interactions and local LAN network load.
 * When local kiosk traffic peaks (`activeKioskSessions >= 2` or high LAN throughput),
 * it dynamically throttles background cloud sync (`CloudSyncService`) down to ensure
 * 100% of LAN bandwidth is reserved for customer kiosk browsing and instant checkout (<50ms).
 */
export class BandwidthShaperService {
  private static instance: BandwidthShaperService;
  private logger: Logger;
  private networkMonitor: NetworkMonitor | null;
  private activeKioskSessions = 0;
  private totalThrottledEvents = 0;
  private currentConfig: BandwidthThrottleConfig = {
    isThrottled: false,
    maxUploadRateKbps: 50000, // 50 Mbps default unthrottled
    delayBetweenChunksMs: 0,
    reason: 'Normal unthrottled bandwidth'
  };
  private monitorTimer: NodeJS.Timeout | null = null;
  private onThrottleChangeCallbacks: Array<(config: BandwidthThrottleConfig) => void> = [];

  private constructor(logger: Logger, networkMonitor: NetworkMonitor | null = null) {
    this.logger = logger;
    this.networkMonitor = networkMonitor;
  }

  public static getInstance(logger?: Logger, networkMonitor?: NetworkMonitor | null): BandwidthShaperService {
    if (!BandwidthShaperService.instance) {
      if (!logger) {
        throw new Error('BandwidthShaperService must be initialized with Logger first.');
      }
      BandwidthShaperService.instance = new BandwidthShaperService(logger, networkMonitor || null);
    }
    return BandwidthShaperService.instance;
  }

  public setNetworkMonitor(networkMonitor: NetworkMonitor): void {
    this.networkMonitor = networkMonitor;
  }

  public registerThrottleListener(callback: (config: BandwidthThrottleConfig) => void): void {
    this.onThrottleChangeCallbacks.push(callback);
  }

  /**
   * Called by WebSocket/Kiosk session tracker whenever a kiosk connects or starts interactive browsing/checkout.
   */
  public updateActiveKioskSessions(count: number): void {
    const prev = this.activeKioskSessions;
    this.activeKioskSessions = Math.max(0, count);
    if (prev !== this.activeKioskSessions) {
      this.evaluateAndApplyThrottle();
    }
  }

  /**
   * Starts periodic bandwidth shaping loop (every 5 seconds).
   */
  public startShaperLoop(intervalMs = 5000): void {
    if (this.monitorTimer) return;
    this.logger.info(`[BandwidthShaper] Starting dynamic bandwidth shaping monitor (interval: ${intervalMs}ms)`);

    this.monitorTimer = setInterval(() => {
      this.evaluateAndApplyThrottle();
    }, intervalMs);
    if (this.monitorTimer.unref) this.monitorTimer.unref();
  }

  public stopShaperLoop(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  /**
   * Evaluates active sessions & network load and returns dynamic throttle options.
   */
  public evaluateAndGetThrottle(): BandwidthThrottleConfig {
    let networkThroughputMbps = 0;
    if (this.networkMonitor) {
      const stats = this.networkMonitor.getStats();
      networkThroughputMbps = stats.throughputMbps || 0;
    }

    // Heavy Throttle: 3+ active kiosk sessions or high LAN throughput (> 50 Mbps)
    if (this.activeKioskSessions >= 3 || networkThroughputMbps > 50) {
      return {
        isThrottled: true,
        maxUploadRateKbps: 250, // 250 Kbps strictly capped for background sync
        delayBetweenChunksMs: 500, // 500ms sleep between chunk uploads
        reason: `High Kiosk Activity (${this.activeKioskSessions} sessions, ${networkThroughputMbps} Mbps LAN load)`
      };
    }

    // Moderate Throttle: 1-2 active kiosk sessions or moderate LAN throughput (> 20 Mbps)
    if (this.activeKioskSessions >= 1 || networkThroughputMbps > 20) {
      return {
        isThrottled: true,
        maxUploadRateKbps: 1000, // 1 Mbps cap for background sync
        delayBetweenChunksMs: 200, // 200ms delay between chunks
        reason: `Active Kiosk Session (${this.activeKioskSessions} sessions, ${networkThroughputMbps} Mbps LAN load)`
      };
    }

    // Unthrottled: 0 active sessions and normal LAN traffic
    return {
      isThrottled: false,
      maxUploadRateKbps: 50000,
      delayBetweenChunksMs: 0,
      reason: 'Idle kiosk traffic; full sync throughput enabled'
    };
  }

  private evaluateAndApplyThrottle(): void {
    const nextConfig = this.evaluateAndGetThrottle();
    const wasThrottled = this.currentConfig.isThrottled;
    const isNowThrottled = nextConfig.isThrottled;

    if (wasThrottled !== isNowThrottled || this.currentConfig.maxUploadRateKbps !== nextConfig.maxUploadRateKbps) {
      if (isNowThrottled) {
        this.totalThrottledEvents++;
        this.logger.warn(`[BandwidthShaper] Throttling Cloud Sync: ${nextConfig.reason}. Cap: ${nextConfig.maxUploadRateKbps} Kbps`);
      } else if (wasThrottled) {
        this.logger.info(`[BandwidthShaper] Restoring full Cloud Sync throughput: ${nextConfig.reason}`);
      }
      this.currentConfig = nextConfig;
      for (const cb of this.onThrottleChangeCallbacks) {
        try { cb(nextConfig); } catch {}
      }
    } else {
      this.currentConfig = nextConfig;
    }
  }

  public getThrottleConfig(): BandwidthThrottleConfig {
    return { ...this.currentConfig };
  }

  public getMetrics(): BandwidthShaperMetrics {
    let status: BandwidthShaperMetrics['currentStatus'] = 'IDLE';
    if (this.currentConfig.isThrottled) {
      status = this.currentConfig.maxUploadRateKbps <= 250 ? 'HEAVY_THROTTLE' : 'THROTTLED';
    } else if (this.activeKioskSessions > 0) {
      status = 'NORMAL';
    }

    let throughput = 0;
    if (this.networkMonitor) {
      throughput = this.networkMonitor.getStats().throughputMbps || 0;
    }

    return {
      currentStatus: status,
      activeKioskSessions: this.activeKioskSessions,
      currentNetworkThroughputMbps: throughput,
      throttleConfig: this.getThrottleConfig(),
      totalThrottledEvents: this.totalThrottledEvents
    };
  }
}
