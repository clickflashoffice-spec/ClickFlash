/**
 * Bandwidth Scheduler Service
 * 
 * Manages upload bandwidth allocation based on:
 * - Time of day (business hours vs off-peak)
 * - Network conditions
 * - User-configured limits
 * - Priority of uploads
 */

import { logger } from '@/utils/logger';

export interface BandwidthLimit {
    uploadKBps: number;      // Max upload speed (KB/s)
    downloadKBps: number;    // Max download speed (KB/s)
    burstKBps?: number;     // Burst allowance
}

export interface ScheduleWindow {
    startHour: number;      // 0-23
    endHour: number;        // 0-23
    limitKBps: number;
    priorityBoost: number;   // 0-100
}

export interface NetworkCondition {
    latencyMs: number;
    packetLoss: number;     // 0-1
    bandwidthAvailable: number; // KB/s estimated
}

export interface BandwidthScheduleConfig {
    enabled: boolean;
    defaultLimitKBps: number;
    scheduleWindows: ScheduleWindow[];
    respectSystemLimits: boolean;
    adaptiveEnabled: boolean;
}

const DEFAULT_CONFIG: BandwidthScheduleConfig = {
    enabled: true,
    defaultLimitKBps: 1024, // 1 MB/s
    scheduleWindows: [
        { startHour: 9, endHour: 17, limitKBps: 512, priorityBoost: 50 },    // Business hours
        { startHour: 17, endHour: 22, limitKBps: 2048, priorityBoost: 30 },  // Evening
        { startHour: 22, endHour: 9, limitKBps: 10240, priorityBoost: 80 },  // Night
    ],
    respectSystemLimits: true,
    adaptiveEnabled: true,
};

class BandwidthSchedulerService {
    private static instance: BandwidthSchedulerService;
    private config: BandwidthScheduleConfig;
    private currentLimitKBps: number = 1024;
    private networkCondition: NetworkCondition = {
        latencyMs: 50,
        packetLoss: 0,
        bandwidthAvailable: 10240,
    };
    private activeUploads: Map<string, { priority: number; bytesUploaded: number }> = new Map();
    private listeners: Set<(limit: BandwidthLimit) => void> = new Set();
    private schedulerInterval: ReturnType<typeof setInterval> | null = null;

    private constructor(config?: Partial<BandwidthScheduleConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(config?: Partial<BandwidthScheduleConfig>): BandwidthSchedulerService {
        if (!BandwidthSchedulerService.instance) {
            BandwidthSchedulerService.instance = new BandwidthSchedulerService(config);
        }
        return BandwidthSchedulerService.instance;
    }

    /**
     * Start the bandwidth scheduler
     */
    public start(): void {
        if (this.schedulerInterval) return;

        // Update limit immediately
        this.updateLimitBasedOnSchedule();

        // Check schedule every minute
        this.schedulerInterval = setInterval(() => {
            this.updateLimitBasedOnSchedule();
        }, 60000);

        // Monitor network every 5 seconds
        setInterval(() => {
            this.updateNetworkCondition();
        }, 5000);

        logger.info('[BandwidthScheduler] Started', this.config as unknown as Record<string, unknown>);
    }

    /**
     * Stop the scheduler
     */
    public stop(): void {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        logger.info('[BandwidthScheduler] Stopped');
    }

    /**
     * Update limit based on time schedule
     */
    private updateLimitBasedOnSchedule(): void {
        if (!this.config.enabled) {
            this.currentLimitKBps = this.config.defaultLimitKBps;
            this.notifyListeners();
            return;
        }

        const now = new Date();
        const currentHour = now.getHours();

        // Check schedule windows
        for (const window of this.config.scheduleWindows) {
            if (this.isHourInWindow(currentHour, window)) {
                let newLimit = window.limitKBps;

                // Apply adaptive reduction based on network
                if (this.config.adaptiveEnabled) {
                    newLimit = this.applyAdaptiveLimit(newLimit);
                }

                if (newLimit !== this.currentLimitKBps) {
                    this.currentLimitKBps = newLimit;
                    logger.info(`[BandwidthScheduler] Limit updated to ${newLimit} KB/s (${window.priorityBoost} priority boost)`);
                }

                this.notifyListeners();
                return;
            }
        }

        // Default limit outside windows
        this.currentLimitKBps = this.config.adaptiveEnabled
            ? this.applyAdaptiveLimit(this.config.defaultLimitKBps)
            : this.config.defaultLimitKBps;
        this.notifyListeners();
    }

    /**
     * Check if hour is within window
     */
    private isHourInWindow(hour: number, window: ScheduleWindow): boolean {
        if (window.startHour < window.endHour) {
            return hour >= window.startHour && hour < window.endHour;
        } else {
            // Window crosses midnight
            return hour >= window.startHour || hour < window.endHour;
        }
    }

    /**
     * Apply adaptive limit based on network conditions
     */
    private applyAdaptiveLimit(baseLimit: number): number {
        let factor = 1.0;

        // Reduce based on latency
        if (this.networkCondition.latencyMs > 200) {
            factor *= 0.5; // Halve limit for high latency
        } else if (this.networkCondition.latencyMs > 100) {
            factor *= 0.75;
        }

        // Reduce based on packet loss
        if (this.networkCondition.packetLoss > 0.05) {
            factor *= 0.3; // Severe packet loss
        } else if (this.networkCondition.packetLoss > 0.01) {
            factor *= 0.6;
        }

        // Reduce based on available bandwidth
        if (this.networkCondition.bandwidthAvailable < baseLimit) {
            factor *= 0.8;
        }

        return Math.floor(baseLimit * factor);
    }

    /**
     * Update network condition estimate
     */
    private async updateNetworkCondition(): Promise<void> {
        try {
            const start = performance.now();
            await fetch('/api/health', { method: 'HEAD' });
            const latency = performance.now() - start;

            // Estimate available bandwidth from latency
            // (simplified heuristic)
            const estimatedBandwidth = latency < 50 ? 10240 :
                                       latency < 100 ? 5120 :
                                       latency < 200 ? 2048 : 512;

            this.networkCondition = {
                latencyMs: latency,
                packetLoss: this.estimatePacketLoss(),
                bandwidthAvailable: estimatedBandwidth,
            };
        } catch {
            // Network issue - reduce bandwidth
            this.networkCondition.bandwidthAvailable = 256;
            this.networkCondition.packetLoss = 0.1;
        }
    }

    /**
     * Estimate packet loss (simplified)
     */
    private estimatePacketLoss(): number {
        // In production, would track actual retransmissions
        return 0;
    }

    /**
     * Get current bandwidth limit
     */
    public getCurrentLimit(): BandwidthLimit {
        return {
            uploadKBps: this.currentLimitKBps,
            downloadKBps: this.currentLimitKBps * 2,
            burstKBps: Math.floor(this.currentLimitKBps * 1.5),
        };
    }

    /**
     * Get recommended chunk size for uploads
     */
    public getRecommendedChunkSize(): number {
        // Optimal chunk size based on latency
        const latency = this.networkCondition.latencyMs;
        
        if (latency < 50) return 1024 * 1024;      // 1MB chunks
        if (latency < 100) return 512 * 1024;    // 512KB chunks
        if (latency < 200) return 256 * 1024;    // 256KB chunks
        return 128 * 1024;                      // 128KB chunks
    }

    /**
     * Get recommended parallel chunk count
     */
    public getParallelChunkCount(): number {
        if (this.currentLimitKBps > 8192) return 4;
        if (this.currentLimitKBps > 4096) return 3;
        if (this.currentLimitKBps > 1024) return 2;
        return 1;
    }

    /**
     * Register upload for tracking
     */
    public registerUpload(uploadId: string, priority: number = 50): void {
        this.activeUploads.set(uploadId, { priority, bytesUploaded: 0 });
    }

    /**
     * Update upload progress
     */
    public updateUploadProgress(uploadId: string, bytesUploaded: number): void {
        const upload = this.activeUploads.get(uploadId);
        if (upload) {
            upload.bytesUploaded = bytesUploaded;
        }
    }

    /**
     * Unregister upload
     */
    public unregisterUpload(uploadId: string): void {
        this.activeUploads.delete(uploadId);
    }

    /**
     * Get priority-scaled limit for an upload
     */
    public getScaledLimit(uploadId: string): number {
        const upload = this.activeUploads.get(uploadId);
        if (!upload) return this.currentLimitKBps;

        // Higher priority uploads get proportionally more bandwidth
        const totalPriority = Array.from(this.activeUploads.values())
            .reduce((sum, u) => sum + u.priority, 0);

        const proportion = upload.priority / totalPriority;
        return Math.floor(this.currentLimitKBps * proportion * 2); // *2 because we want sum to not exceed limit
    }

    /**
     * Get network condition
     */
    public getNetworkCondition(): NetworkCondition {
        return { ...this.networkCondition };
    }

    /**
     * Get schedule status
     */
    public getStatus(): {
        enabled: boolean;
        currentLimitKBps: number;
        networkCondition: NetworkCondition;
        activeUploads: number;
        nextScheduleChange?: { hour: number; limitKBps: number };
    } {
        const now = new Date();
        const currentHour = now.getHours();
        const nextWindow = this.findNextScheduleChange(currentHour);

        return {
            enabled: this.config.enabled,
            currentLimitKBps: this.currentLimitKBps,
            networkCondition: this.getNetworkCondition(),
            activeUploads: this.activeUploads.size,
            nextScheduleChange: nextWindow,
        };
    }

    /**
     * Find next schedule change
     */
    private findNextScheduleChange(currentHour: number): { hour: number; limitKBps: number } | undefined {
        for (let h = currentHour + 1; h <= currentHour + 24; h++) {
            const checkHour = h % 24;
            for (const window of this.config.scheduleWindows) {
                if (this.isHourInWindow(checkHour, window)) {
                    return { hour: checkHour, limitKBps: window.limitKBps };
                }
            }
        }
        return undefined;
    }

    /**
     * Subscribe to limit changes
     */
    public subscribe(callback: (limit: BandwidthLimit) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify listeners of limit change
     */
    private notifyListeners(): void {
        const limit = this.getCurrentLimit();
        for (const listener of this.listeners) {
            try {
                listener(limit);
            } catch (error) {
                logger.error('[BandwidthScheduler] Listener error', error instanceof Error ? error : undefined);
            }
        }
    }

    /**
     * Update configuration
     */
    public configure(config: Partial<BandwidthScheduleConfig>): void {
        this.config = { ...this.config, ...config };
        this.updateLimitBasedOnSchedule();
        logger.info('[BandwidthScheduler] Configuration updated', this.config as unknown as Record<string, unknown>);
    }
}

export const bandwidthScheduler = BandwidthSchedulerService.getInstance();
export default bandwidthScheduler;
