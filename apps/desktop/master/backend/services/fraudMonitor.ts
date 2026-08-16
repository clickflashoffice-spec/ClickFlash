import { logger } from '../utils/logger';
import { FraudAlert, FraudSeverity, FraudType, PosAnomaly } from '@clickflash/types';
import { randomUUID } from 'crypto';
import { redisCache } from './redisCacheService';

export class FraudMonitor {
    private lastKnownLocations: Map<string, { lat: number, lng: number, timestamp: number }> = new Map();
    private wsBroadcast: ((event: string, data: any) => void) | null = null;

    public init(wsBroadcast: (event: string, data: any) => void) {
        this.wsBroadcast = wsBroadcast;
    }

    private async persistAndBroadcast(alert: FraudAlert | PosAnomaly) {
        try {
            await redisCache.publishEvent('fraud_alerts', {
                payload: JSON.stringify(alert)
            });
            logger.info(`[FraudMonitor] Published alert to Redis Stream 'fraud_alerts'`);
        } catch (err: any) {
            logger.error(`[FraudMonitor] Failed to publish alert to Redis`, { error: err.message });
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
}

export const fraudMonitor = new FraudMonitor();
