import { logger } from '../utils/logger';
import { FraudAlert, FraudSeverity, FraudType, PosAnomaly } from '@clickflash/types';
import { randomUUID } from 'crypto';
import { RedisCacheService } from './redisCacheService';

export class FraudMonitor {
    private lastKnownLocations: Map<string, { lat: number, lng: number, timestamp: number }> = new Map();
    private wsBroadcast: ((event: string, data: any) => void) | null = null;
    private cacheService: RedisCacheService | null = null;

    public init(cacheService: RedisCacheService, wsBroadcast: (event: string, data: any) => void) {
        this.cacheService = cacheService;
        this.wsBroadcast = wsBroadcast;
    }

    private async persistAndBroadcast(alert: FraudAlert | PosAnomaly) {
        if (this.cacheService) {
            try {
                await this.cacheService.publishEvent('fraud_alerts', {
                    payload: JSON.stringify(alert)
                });
                logger.info(`[FraudMonitor] Published alert to Redis Stream 'fraud_alerts'`);
            } catch (err: any) {
                logger.error(`[FraudMonitor] Failed to publish alert to Redis`, { error: err.message });
            }
        } else {
            logger.warn('[FraudMonitor] RedisCacheService not injected. Skipping publishEvent.');
        }

        if (this.wsBroadcast) {
            this.wsBroadcast('FRAUD_ALERT', alert);
        }
    }

    /**
     * Analyzes high-frequency GPS telemetry from photographer Pro apps at the edge.
     * Flags impossible velocities or location spoofing immediately without cloud latency.
     */
    public evaluateTelemetry(photographerId: string, currentLoc: { lat: number, lng: number }): FraudAlert | null {
        const now = Date.now();
        const lastLoc = this.lastKnownLocations.get(photographerId);

        if (lastLoc) {
            const timeDiffSecs = (now - lastLoc.timestamp) / 1000;
            // Simple equirectangular approximation for distance in meters
            const R = 6371e3; 
            const x = (currentLoc.lng - lastLoc.lng) * Math.cos((lastLoc.lat + currentLoc.lat) / 2 * Math.PI / 180);
            const y = (currentLoc.lat - lastLoc.lat);
            const distanceMeters = Math.sqrt(x * x + y * y) * (Math.PI / 180) * R;

            const velocity = timeDiffSecs > 0 ? distanceMeters / timeDiffSecs : 0;

            // If moving faster than 35 m/s (~80mph) in a theme park, it's likely spoofing
            if (velocity > 35) {
                const alert: FraudAlert = {
                    id: randomUUID(),
                    destinationId: 'LOCAL_DEST',
                    photographerId,
                    type: 'location_spoofing',
                    severity: 'high',
                    status: 'open',
                    evidence: {
                        expectedLocation: lastLoc,
                        actualLocation: currentLoc,
                        velocityMetersPerSecond: velocity
                    },
                    createdAt: new Date().toISOString()
                };

                logger.warn(`[FraudMonitor] LOCATION SPOOFING DETECTED for Photographer ${photographerId}. Velocity: ${velocity.toFixed(2)} m/s`);
                
                this.persistAndBroadcast(alert).catch(err => 
                    logger.error(`[FraudMonitor] Unhandled error persisting alert`, { error: err.message })
                );
                
                // Update map to prevent cascading alerts
                this.lastKnownLocations.set(photographerId, { ...currentLoc, timestamp: now });
                return alert;
            }
        }

        this.lastKnownLocations.set(photographerId, { ...currentLoc, timestamp: now });
        return null;
    }

    public reportPosAnomaly(anomaly: PosAnomaly) {
        anomaly.id = anomaly.id || randomUUID();
        anomaly.status = 'open'; // Human review
        this.persistAndBroadcast(anomaly).catch(err => 
            logger.error(`[FraudMonitor] Unhandled error persisting anomaly`, { error: err.message })
        );
    }

    /**
     * Evaluates hardware health metrics for edge devices (Master node or kiosks).
     * Alerts if thermal limits are breached or unauthorized USB devices are detected.
     */
    public evaluateHardwareHealth(deviceId: string, metrics: { cpuTemp?: number, diskUsagePct?: number, unauthorizedUsbEvents?: number }): void {
        const anomalies: string[] = [];
        
        if (metrics.cpuTemp && metrics.cpuTemp > 85) {
            anomalies.push(`Thermal Critical: ${metrics.cpuTemp}°C`);
        }
        
        if (metrics.diskUsagePct && metrics.diskUsagePct > 95) {
            anomalies.push(`Disk Capacity Critical: ${metrics.diskUsagePct}%`);
        }

        if (metrics.unauthorizedUsbEvents && metrics.unauthorizedUsbEvents > 0) {
            anomalies.push(`Unauthorized USB mass storage detected (${metrics.unauthorizedUsbEvents} events)`);
        }

        if (anomalies.length > 0) {
            logger.warn(`[FraudMonitor] Hardware Anomaly for ${deviceId}: ${anomalies.join(', ')}`);
            this.persistAndBroadcast({
                id: randomUUID(),
                type: 'hardware_anomaly',
                photographerId: deviceId, // Using deviceId here
                severity: metrics.unauthorizedUsbEvents ? 'critical' : 'high',
                status: 'open',
                evidence: {
                    details: anomalies
                },
                createdAt: new Date().toISOString()
            } as any).catch(err => logger.error(`[FraudMonitor] Error broadcasting hardware health: ${err.message}`));
        }
    }

    /**
     * Reconciles physical group sessions shot against POS transactions.
     * Flags photographers under-reporting cash sales (Skimming).
     */
    public evaluatePosReconciliation(photographerId: string, sessionCount: number, cashOrders: number, cardOrders: number): FraudAlert | null {
        // Typical attach rate is usually >10%. If they shoot 50 groups and log 0 or 1 cash orders, 
        // while cash should make up at least some percentage, it's highly suspicious.
        const totalOrders = cashOrders + cardOrders;
        
        if (sessionCount > 30 && cashOrders <= 1) {
            // It's statistically improbable to shoot 30+ groups and have only 1 cash sale if the park average is higher
            const alert: FraudAlert = {
                id: randomUUID(),
                destinationId: 'LOCAL_DEST',
                photographerId,
                type: 'cash_under_table',
                severity: 'high',
                status: 'open',
                evidence: {
                    details: {
                        sessionCount,
                        cashOrders,
                        cardOrders,
                        attachRate: (totalOrders / sessionCount).toFixed(2)
                    }
                } as any,
                createdAt: new Date().toISOString()
            };

            logger.warn(`[FraudMonitor] POS SKIMMING SUSPICION for Photographer ${photographerId}. Groups: ${sessionCount}, Cash Orders: ${cashOrders}`);
            this.persistAndBroadcast(alert).catch(err => logger.error(`[FraudMonitor] Error broadcasting POS anomaly: ${err.message}`));
            return alert;
        }

        return null;
    }
}

export const fraudMonitor = new FraudMonitor();
