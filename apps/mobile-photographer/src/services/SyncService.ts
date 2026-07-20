import { discoveryService } from './discoveryService';
import { meshSyncService } from './MeshSyncService';
import { networkRoutingService } from './NetworkRoutingService';
import { offlineQueueService } from './OfflineQueueService';
import { logger } from "@/utils/logger";

export interface PhotoAsset {
    id: string;
    uri: string;
    filename: string;
    mediaType: 'photo' | 'video';
    creationTime: number;
    width: number;
    height: number;
    fileSize: number;
    aiMetadata?: {
        poseQualityScore?: number;
        blinkDetected?: boolean;
        blurDetected?: boolean;
        voiceTags?: string[];
        meshRelayedBy?: string;
    };
}

export class SyncService {
    private masterIp: string | null = null;
    private port: number = 8090; // Default Master PC port

    constructor() {
        this.initialize();
    }

    private async initialize() {
        this.masterIp = await discoveryService.discoverMasterPC();
        // Also trigger initial network check
        networkRoutingService.checkHealth();
    }

    /**
     * Queues a photo for sync via the offline queue.
     * Called when a new photo is ingested via USB PTP.
     */
    public async queuePhotoForSync(photo: PhotoAsset) {
        logger.info(`[SyncService] Enqueueing photo ${photo.filename} to SQLite offline queue.`);
        await offlineQueueService.enqueue('PHOTO_SYNC', '/api/photos/upload', 'POST', {
            uri: photo.uri,
            filename: photo.filename,
            aiMetadata: photo.aiMetadata
        }, 'HIGH');
        // Trigger a background flush attempt
        networkRoutingService.flushOfflineQueue();
    }

    /**
     * Direct sync of application settings from Cloudflare to mobile app via Master PC fallback.
     */
    public async syncSettings() {
        try {
            const targetUrl = networkRoutingService.resolveTargetUrl('/api/settings/sync', false);
            if (targetUrl) {
                const res = await fetch(targetUrl);
                if (res.ok) {
                    const data = await res.json();
                    logger.info(`[SyncService] Synced settings from ${targetUrl}`, data);
                    return data;
                }
            }
            return null;
        } catch (error) {
            logger.error('[SyncService] Failed to sync settings:', error);
            return null;
        }
    }

    /**
     * Pushes a biometric shift event (Clock In/Out) to the Master PC or Cloudflare directly with offline queueing.
     */
    public async pushShiftEvent(shift: any): Promise<boolean> {
        try {
            const targetUrl = networkRoutingService.resolveTargetUrl('/api/shifts', true);
            if (targetUrl) {
                const res = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shift),
                });
                if (res.ok) {
                    logger.info(`[SyncService] Synced shift event to ${targetUrl}`);
                    return true;
                }
            }

            // Queue offline if direct push failed or offline
            logger.info('[SyncService] Network unreachable right now. Enqueueing shift event to durable disk queue.');
            await offlineQueueService.enqueue('SHIFT_EVENT', '/api/shifts', 'POST', shift, 'HIGH');
            return false;
        } catch (error) {
            logger.error('[SyncService] Failed to push shift event, queueing offline:', error);
            await offlineQueueService.enqueue('SHIFT_EVENT', '/api/shifts', 'POST', shift, 'HIGH');
            return false;
        }
    }

    /**
     * Enrolls a photographer's 128D face vector with fallback to Master PC proxy and durable queueing.
     */
    public async enrollPhotographerFace(photographerId: string, name: string, stationId: string | null, faceVector: number[]): Promise<boolean> {
        const payload = { photographerId, name, stationId, faceVector };
        try {
            const targetUrl = networkRoutingService.resolveTargetUrl('/api/photographers/enroll-face', true);
            if (targetUrl) {
                const res = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    logger.info(`[SyncService] Enrolled face vector via ${targetUrl}`);
                    return true;
                }
            }

            logger.info('[SyncService] Enqueueing face enrollment to durable disk queue.');
            await offlineQueueService.enqueue('FACE_ENROLL', '/api/photographers/enroll-face', 'POST', payload, 'HIGH');
            return false;
        } catch (error) {
            logger.error('[SyncService] Failed to enroll face vector, queueing offline:', error);
            await offlineQueueService.enqueue('FACE_ENROLL', '/api/photographers/enroll-face', 'POST', payload, 'HIGH');
            return false;
        }
    }

    /**
     * Fetches an enrolled photographer's face vector with fallback to Master PC proxy.
     */
    public async getPhotographerFaceVector(photographerId: string): Promise<number[] | null> {
        try {
            const targetUrl = networkRoutingService.resolveTargetUrl(`/api/photographers/${photographerId}/face-vector`, true);
            if (targetUrl) {
                const res = await fetch(targetUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.photographer?.faceVector) {
                        return data.photographer.faceVector;
                    }
                }
            }
            return null;
        } catch (error) {
            logger.error('[SyncService] Failed to fetch face vector:', error);
            return null;
        }
    }
}

export const syncService = new SyncService();
