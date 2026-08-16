import { logger } from '../utils/logger';
import { HotspotDispatchEvent, DispatchPriority, DispatchStatus, DispatchTrigger, DispatchNotification } from '@clickflash/types';
import { randomUUID } from 'crypto';
import { redisCache } from './redisCacheService';

export class HotspotDispatcher {
    /**
     * Analyzes real-time guest density telemetry (e.g., from BLE nets or Kiosk check-ins)
     * and dispatches a HotspotDispatchEvent to re-route photographers locally.
     */
    public async evaluateTelemetry(zoneId: string, guestCount: number, availablePhotographers: string[]): Promise<HotspotDispatchEvent | null> {
        // Simple threshold logic for AI Dispatch
        if (guestCount > 100 && availablePhotographers.length > 0) {
            const recommendedCount = Math.ceil(guestCount / 50); // 1 photog per 50 guests
            
            // Select the closest/idle photographers (mocked here as selecting the first N)
            const dispatchedPhotographerIds = availablePhotographers.slice(0, recommendedCount);

            if (dispatchedPhotographerIds.length === 0) return null;

            const priority: DispatchPriority = guestCount > 250 ? 'critical' : 'high';
            const event: HotspotDispatchEvent = {
                id: randomUUID(),
                destinationId: 'LOCAL_DEST',
                zoneId,
                priority,
                trigger: 'crowd_density',
                recommendedPhotographerCount: recommendedCount,
                dispatchedPhotographerIds,
                status: 'pending',
                timestamp: new Date().toISOString(),
                metadata: {
                    crowdEstimate: guestCount
                }
            };

            logger.info(`[HotspotDispatcher] SURGE DETECTED in ${zoneId}. Dispatching ${dispatchedPhotographerIds.length} photographers.`);
            
            // Generate DispatchNotification objects and push to Redis Streams
            for (const pId of dispatchedPhotographerIds) {
                const notification: DispatchNotification = {
                    dispatchId: randomUUID(),
                    photographerId: pId,
                    targetZone: {
                        zoneId,
                        destinationId: 'LOCAL_DEST',
                        name: `Zone ${zoneId}`,
                        center: { lat: 0, lng: 0 },
                        radiusMeters: 50,
                        currentCrowdDensity: guestCount > 250 ? 'High' : 'Medium',
                        trend: 'increasing',
                        activePhotographerCount: 0,
                        requiredPhotographerCount: recommendedCount
                    },
                    priority,
                    trigger: 'crowd_density',
                    message: `Surge detected in Zone ${zoneId}. Please relocate to capture moments.`,
                    dispatchedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 15 * 60000).toISOString(), // 15 mins expiry
                    actionRequired: 'acknowledge' // Mandatory acknowledgment
                };

                await redisCache.publishEvent('hotspot:dispatch', {
                    payload: JSON.stringify(notification)
                });
            }
            
            return event;
        }

        return null;
    }
}

export const hotspotDispatcher = new HotspotDispatcher();
