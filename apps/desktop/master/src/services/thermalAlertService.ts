/**
 * Thermal Alert Service
 * 
 * Provides system temperature monitoring with configurable alerts
 * and automatic performance scaling recommendations.
 */

import { logger } from '@/utils/logger';

export interface ThermalThresholds {
    warning: number;
    critical: number;
    emergency: number;
}

export interface ThermalAlert {
    id: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    temp: number;
    timestamp: Date;
    acknowledged: boolean;
}

export interface ThermalConfig {
    enabled: boolean;
    pollingInterval: number;
    thresholds: ThermalThresholds;
    enableNotifications: boolean;
    enableAutoScale: boolean;
}

const DEFAULT_THRESHOLDS: ThermalThresholds = {
    warning: 70,     // Start warning at 70°C
    critical: 85,   // Critical at 85°C
    emergency: 95,   // Emergency shutdown at 95°C
};

const DEFAULT_CONFIG: ThermalConfig = {
    enabled: true,
    pollingInterval: 5000,
    thresholds: DEFAULT_THRESHOLDS,
    enableNotifications: true,
    enableAutoScale: true,
};

class ThermalAlertService {
    private static instance: ThermalAlertService;
    private config: ThermalConfig;
    private alerts: ThermalAlert[] = [];
    private listeners: Set<(alert: ThermalAlert) => void> = new Set();
    private lastTemp: number | null = null;
    private consecutiveHighReadings = 0;

    private constructor(config: Partial<ThermalConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    public static getInstance(): ThermalAlertService {
        if (!ThermalAlertService.instance) {
            ThermalAlertService.instance = new ThermalAlertService();
        }
        return ThermalAlertService.instance;
    }

    /**
     * Update configuration
     */
    public configure(config: Partial<ThermalConfig>): void {
        this.config = { ...this.config, ...config };
        logger.info('[ThermalAlert] Configuration updated', this.config);
    }

    /**
     * Get current configuration
     */
    public getConfig(): ThermalConfig {
        return { ...this.config };
    }

    /**
     * Subscribe to alerts
     */
    public subscribe(callback: (alert: ThermalAlert) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Process a thermal reading and generate alerts if needed
     */
    public processReading(temp: number | null, _workerLimit: number = 4): {
        status: 'normal' | 'warning' | 'critical';
        shouldScale: boolean;
        recommendation: string;
    } {
        if (temp === null) {
            return { status: 'normal', shouldScale: false, recommendation: 'No data' };
        }

        this.lastTemp = temp;
        const { thresholds } = this.config;
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        let shouldScale = false;
        let recommendation = 'Operating normally';

        if (temp >= thresholds.emergency) {
            status = 'critical';
            shouldScale = true;
            recommendation = 'EMERGENCY: Temperature critical! Consider shutting down non-essential processes.';
            this.generateAlert('critical', recommendation, temp);
        } else if (temp >= thresholds.critical) {
            status = 'critical';
            shouldScale = true;
            recommendation = 'Critical: Reduce processing load. Consider reducing worker count.';
            this.consecutiveHighReadings++;
            if (this.consecutiveHighReadings >= 3) {
                this.generateAlert('critical', recommendation, temp);
            }
        } else if (temp >= thresholds.warning) {
            status = 'warning';
            recommendation = 'Warning: Temperature elevated. Monitor closely.';
            this.consecutiveHighReadings++;
            if (this.consecutiveHighReadings >= 5) {
                this.generateAlert('warning', recommendation, temp);
            }
        } else {
            status = 'normal';
            this.consecutiveHighReadings = 0;
            recommendation = 'Operating normally';
        }

        // Log temperature event
        if (status !== 'normal') {
            logger.warn(`[ThermalAlert] Temperature ${temp}°C - ${recommendation}`);
        }

        return { status, shouldScale, recommendation };
    }

    /**
     * Generate and broadcast an alert
     */
    private generateAlert(level: ThermalAlert['level'], message: string, temp: number): void {
        const alert: ThermalAlert = {
            id: `thermal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            level,
            message,
            temp,
            timestamp: new Date(),
            acknowledged: false,
        };

        this.alerts.unshift(alert);

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(0, 50);
        }

        // Notify listeners
        for (const listener of this.listeners) {
            try {
                listener(alert);
            } catch (err) {
                logger.error('[ThermalAlert] Listener error', err);
            }
        }

        // Send browser notification if enabled
        if (this.config.enableNotifications && level !== 'info') {
            this.sendNotification(alert);
        }
    }

    /**
     * Send browser notification
     */
    private sendNotification(alert: ThermalAlert): void {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Thermal Alert: ${alert.level.toUpperCase()}`, {
                body: alert.message,
                icon: '/icon.png',
                tag: 'thermal-alert',
            });
        }
    }

    /**
     * Request notification permission
     */
    public async requestNotificationPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    /**
     * Get alert history
     */
    public getAlerts(limit: number = 10): ThermalAlert[] {
        return this.alerts.slice(0, limit);
    }

    /**
     * Acknowledge an alert
     */
    public acknowledgeAlert(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
        }
    }

    /**
     * Get unacknowledged alert count
     */
    public getUnacknowledgedCount(): number {
        return this.alerts.filter(a => !a.acknowledged).length;
    }

    /**
     * Clear all alerts
     */
    public clearAlerts(): void {
        this.alerts = [];
    }

    /**
     * Get recommended worker limit based on temperature
     */
    public getRecommendedWorkerLimit(temp: number | null, currentLimit: number = 4): number {
        if (temp === null) return currentLimit;

        if (temp >= this.config.thresholds.emergency) {
            return 1; // Minimal workers
        } else if (temp >= this.config.thresholds.critical) {
            return Math.max(1, Math.floor(currentLimit / 2));
        } else if (temp >= this.config.thresholds.warning) {
            return Math.max(2, Math.floor(currentLimit * 0.75));
        }

        return currentLimit;
    }

    /**
     * Check if system is healthy
     */
    public isSystemHealthy(): boolean {
        if (this.lastTemp === null) return true;
        return this.lastTemp < this.config.thresholds.warning;
    }
}

export const thermalAlertService = ThermalAlertService.getInstance();
export default thermalAlertService;
