import os from "os";
import { Logger } from '../utils/logger';

interface TransferEvent {
  timestamp: number;
  bytes: number;
  duration: number;
  type: "upload" | "download";
  success: boolean;
  clientId?: string;
  errorMsg?: string;
}

interface PerClientStats {
  clientId: string;
  totalBytes: number;
  successCount: number;
  failCount: number;
  avgLatencyMs: number;
  lastSeen: number;
}

export class NetworkMonitor {
  private events: TransferEvent[] = [];
  private readonly MAX_EVENTS = 2000;
  private readonly WINDOW_MS = 60_000; // 1-minute rolling window

  constructor(_logger: Logger) {
  }

  /** Record a transfer event (upload or download). */
  public recordEvent(event: Omit<TransferEvent, "timestamp">) {
    this.events.push({ ...event, timestamp: Date.now() });
    if (this.events.length > this.MAX_EVENTS) this.events.shift();
  }

  /** Aggregate stats for the rolling window. */
  public getStats() {
    const now = Date.now();
    const recent = this.events.filter(
      (e) => now - e.timestamp < this.WINDOW_MS,
    );

    const totalBytes = recent.reduce((acc, e) => acc + e.bytes, 0);
    const totalDuration = recent.reduce((acc, e) => acc + e.duration, 0);
    const successCount = recent.filter((e) => e.success).length;
    const failCount = recent.length - successCount;

    const throughput =
      totalDuration > 0 ? totalBytes / (totalDuration / 1000) : 0; // bytes/sec
    const avgLatency = recent.length > 0 ? totalDuration / recent.length : 0; // ms
    const errorRate = recent.length > 0 ? failCount / recent.length : 0;

    return {
      throughput,
      throughputMbps: +((throughput / 1_000_000) * 8).toFixed(3),
      avgLatency: +avgLatency.toFixed(2),
      successRate:
        recent.length > 0 ? +(successCount / recent.length).toFixed(4) : 1,
      errorRate: +errorRate.toFixed(4),
      failCount,
      eventCount: recent.length,
      totalBytesTransferred: totalBytes,
      activeWindowMs: this.WINDOW_MS,
    };
  }

  /** Per-client breakdown (useful for identifying problematic kiosks). */
  public getPerClientStats(): PerClientStats[] {
    const now = Date.now();
    const recent = this.events.filter(
      (e) => now - e.timestamp < this.WINDOW_MS && e.clientId,
    );

    const clientMap = new Map<string, TransferEvent[]>();
    for (const e of recent) {
      const id = e.clientId!;
      if (!clientMap.has(id)) clientMap.set(id, []);
      clientMap.get(id)!.push(e);
    }

    return Array.from(clientMap.entries()).map(([clientId, evts]) => ({
      clientId,
      totalBytes: evts.reduce((acc, e) => acc + e.bytes, 0),
      successCount: evts.filter((e) => e.success).length,
      failCount: evts.filter((e) => !e.success).length,
      avgLatencyMs: +(
        evts.reduce((acc, e) => acc + e.duration, 0) / evts.length
      ).toFixed(2),
      lastSeen: Math.max(...evts.map((e) => e.timestamp)),
    }));
  }

  /** Recent failed transfer details for diagnostics. */
  public getRecentErrors(limit = 20): TransferEvent[] {
    return this.events
      .filter((e) => !e.success)
      .slice(-limit)
      .map((e) => ({ ...e }));
  }

  /** Network interface snapshot. */
  public static getInterfaceSnapshot() {
    const nets = os.networkInterfaces();
    return Object.entries(nets).flatMap(([name, interfaces]) =>
      (interfaces || [])
        .filter((i) => i.family === "IPv4")
        .map((i) => ({
          name,
          address: i.address,
          netmask: i.netmask,
          internal: i.internal,
          mac: i.mac,
        })),
    );
  }

  /** System-level resource snapshot. */
  public static getSystemSnapshot() {
    const load = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || "Unknown",
      loadAvg: { "1m": load[0], "5m": load[1], "15m": load[2] },
      memory: {
        totalMB: +(totalMem / 1_048_576).toFixed(2),
        freeMB: +(freeMem / 1_048_576).toFixed(2),
        usedMB: +((totalMem - freeMem) / 1_048_576).toFixed(2),
        usagePercent: +((1 - freeMem / totalMem) * 100).toFixed(1),
      },
    };
  }

  public clear() {
    this.events = [];
  }
}
