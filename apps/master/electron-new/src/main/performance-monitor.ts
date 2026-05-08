import { app, BrowserWindow, process } from 'electron';
import { getLogger } from '../utils/logger';
import os from 'os';

const logger = getLogger('PerformanceMonitor');

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  memory: MemoryUsage;
  cpu: {
    usage: number;
  };
  system: {
    totalMemory: number;
    freeMemory: number;
    loadAverage: number[];
  };
  app: {
    version: string;
    uptime: number;
    electronVersion: string;
    nodeVersion: string;
  };
}

export interface PerformanceSnapshot {
  startupTime?: number;
  windowReadyTime?: number;
  memoryPeak?: number;
  avgFrameRate?: number;
}

class PerformanceMonitor {
  private snapshots: PerformanceSnapshot = {};
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 60;
  private intervalId: NodeJS.Timeout | null = null;
  private frameCount = 0;
  private lastFrameTime = Date.now();
  
  constructor() {
    this.snapshots.startupTime = Date.now();
  }
  
  public startMonitoring(intervalMs = 5000): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    this.intervalId = setInterval(() => {
      const metrics = this.collectMetrics();
      this.metricsHistory.push(metrics);
      
      if (this.metricsHistory.length > this.MAX_HISTORY) {
        this.metricsHistory.shift();
      }
      
      this.checkMemoryPressure(metrics);
    }, intervalMs);
    
    logger.info('Performance monitoring started');
  }
  
  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Performance monitoring stopped');
  }
  
  public recordWindowReady(): void {
    this.snapshots.windowReadyTime = Date.now();
    if (this.snapshots.startupTime) {
      const startupDuration = this.snapshots.windowReadyTime - this.snapshots.startupTime;
      logger.info(`Window ready after ${startupDuration}ms`);
    }
  }
  
  public recordFrame(): void {
    this.frameCount++;
    const now = Date.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= 1000) {
      this.snapshots.avgFrameRate = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }
  
  public collectMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers || 0,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000,
      },
      system: {
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
      },
      app: {
        version: app.getVersion(),
        uptime: process.uptime(),
        electronVersion: process.versions.electron || '',
        nodeVersion: process.versions.node,
      },
    };
  }
  
  private checkMemoryPressure(metrics: PerformanceMetrics): void {
    const heapUsedGB = metrics.memory.heapUsed / (1024 * 1024 * 1024);
    const rssGB = metrics.memory.rss / (1024 * 1024 * 1024);
    
    if (heapUsedGB > 1.5) {
      logger.warn(`High memory pressure: Heap used ${heapUsedGB.toFixed(2)}GB`);
    }
    
    if (rssGB > 2) {
      logger.warn(`High RSS memory: ${rssGB.toFixed(2)}GB`);
    }
  }
  
  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }
  
  public getSnapshot(): PerformanceSnapshot {
    return { ...this.snapshots };
  }
  
  public getAverageMemoryUsage(): number {
    if (this.metricsHistory.length === 0) return 0;
    const sum = this.metricsHistory.reduce((acc, m) => acc + m.memory.heapUsed, 0);
    return sum / this.metricsHistory.length;
  }
  
  public getPeakMemoryUsage(): number {
    if (this.metricsHistory.length === 0) return 0;
    return Math.max(...this.metricsHistory.map(m => m.memory.heapUsed));
  }
  
  public formatMemory(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
  
  public getReport(): string {
    const snapshot = this.getSnapshot();
    const avgMemory = this.getAverageMemoryUsage();
    const peakMemory = this.getPeakMemoryUsage();
    
    let report = '=== Performance Report ===\n';
    
    if (snapshot.startupTime && snapshot.windowReadyTime) {
      report += `Startup Time: ${snapshot.windowReadyTime - snapshot.startupTime}ms\n`;
    }
    
    if (snapshot.avgFrameRate) {
      report += `Avg Frame Rate: ${snapshot.avgFrameRate.toFixed(2)} FPS\n`;
    }
    
    report += `Avg Heap: ${this.formatMemory(avgMemory)}\n`;
    report += `Peak Heap: ${this.formatMemory(peakMemory)}\n`;
    
    return report;
  }
}

export const performanceMonitor = new PerformanceMonitor();
