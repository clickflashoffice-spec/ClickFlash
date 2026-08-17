import { logger } from '../utils/logger';
import { HotspotDispatchEvent, DispatchPriority, DispatchStatus, DispatchTrigger, DispatchNotification } from '@clickflash/types';
import { randomUUID } from 'crypto';
import { redisCache } from './redisCacheService';

export class HotspotDispatcher {
    /**
     * Analyzes real-time guest density telemetry (e.g., from BLE nets or Kiosk check-ins)
     * and dispatches a HotspotDispatchEvent to re-route photographers locally,
     * taking into account environmental factors like weather and time of day.
     */
    public async evaluateTelemetry(
        zoneId: string, 
        guestCount: number, 
        availablePhotographers: string[],
        environmentalContext?: { weather?: 'sunny' | 'rain' | 'cloudy', timeOfDay?: 'day' | 'night' }
    ): Promise<HotspotDispatchEvent | null> {
        // AI Dynamic Yield / Routing logic: Do not dispatch to outdoor zones in heavy rain unless it's a known covered area.
        // For this edge node implementation, if it's raining and it's an outdoor zone (assumed general zones), reduce dispatch priority or abort.
        if (environmentalContext?.weather === 'rain') {
            logger.info(`[HotspotDispatcher] Aborting or reducing dispatch in ${zoneId} due to rain.`);
            guestCount = Math.floor(guestCount * 0.3); // Drastically reduce perceived crowd value in rain
        }

        // Night time might need flash equipment. We could filter available photographers based on equipment.
        
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
                    crowdEstimate: guestCount,
                    weatherCondition: environmentalContext?.weather || 'unknown'
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
