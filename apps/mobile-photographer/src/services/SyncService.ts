import { discoveryService } from './discoveryService';
import { meshSyncService } from './MeshSyncService';
import { networkRoutingService } from './NetworkRoutingService';
import { offlineQueueService } from './OfflineQueueService';

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
    private syncQueue: PhotoAsset[] = [];
    private isSyncing: boolean = false;

    constructor() {
        this.initialize();
    }

    private async initialize() {
        this.masterIp = await discoveryService.discoverMasterPC();
        // Also trigger initial network check
        networkRoutingService.checkHealth();
    }

    /**
     * Queues a photo for sync to the Master PC.
     * Called when a new photo is ingested via USB PTP.
     */
    public queuePhotoForSync(photo: PhotoAsset) {
        this.syncQueue.push(photo);
        console.log(`[SyncService] Queued photo ${photo.filename} for sync. Queue size: ${this.syncQueue.length}`);
        this.processQueue();
    }

    /**
     * Processes the queue and uploads photos to the Master PC via LAN or P2P Mesh Relay.
     */
    private async processQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;

        this.isSyncing = true;

        // Ensure network health check runs before routing
        const snapshot = await networkRoutingService.checkHealth();
        this.masterIp = snapshot.masterIp;

        if (snapshot.tier === 'OFFLINE' || snapshot.tier === 'OFFLINE_MESH' || !this.masterIp) {
            console.warn('[SyncService] Master PC not directly reachable over LAN. Delegating to P2P Mesh Relay and disk queue!');
            while (this.syncQueue.length > 0) {
                const photo = this.syncQueue[0];
                const relayed = await meshSyncService.queueForPeerRelay(photo);
                if (!relayed) {
                    await offlineQueueService.enqueue('PHOTO_SYNC', '/api/photos/upload', 'POST', {
                        uri: photo.uri,
                        filename: photo.filename,
                        aiMetadata: photo.aiMetadata
                    }, 'HIGH');
                }
                this.syncQueue.shift();
            }
            this.isSyncing = false;
            return;
        }

        while (this.syncQueue.length > 0) {
            const photo = this.syncQueue[0];
            try {
                const success = await this.uploadPhotoToMaster(photo);
                if (success) {
                    console.log(`[SyncService] Successfully synced ${photo.filename}`);
                    this.syncQueue.shift(); // Remove from queue
                } else {
                    console.warn(`[SyncService] LAN sync failed for ${photo.filename}. Delegating to P2P Mesh Relay!`);
                    const relayed = await meshSyncService.queueForPeerRelay(photo);
                    if (!relayed) {
                        await offlineQueueService.enqueue('PHOTO_SYNC', '/api/photos/upload', 'POST', {
                            uri: photo.uri,
                            filename: photo.filename,
                            aiMetadata: photo.aiMetadata
                        }, 'HIGH');
                    }
                    this.syncQueue.shift();
                }
            } catch (error) {
                console.error(`[SyncService] Error during sync:`, error);
                await meshSyncService.queueForPeerRelay(photo);
                this.syncQueue.shift();
            }
        }

        this.isSyncing = false;
    }

    /**
     * Uploads a single photo to the Master PC via multipart/form-data over LAN.
     */
    private async uploadPhotoToMaster(photo: PhotoAsset): Promise<boolean> {
        try {
            const formData = new FormData();
            
            formData.append('photo', {
                uri: photo.uri,
                name: photo.filename,
                type: 'image/jpeg',
            } as any);

            if (photo.aiMetadata) {
                formData.append('aiMetadata', JSON.stringify(photo.aiMetadata));
            }

            const uploadUrl = `http://${this.masterIp}:${this.port}/api/photos/upload`;
            
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });

            return response.ok;
        } catch (error) {
            console.error('[SyncService] Upload network error:', error);
            return false;
        }
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
                    console.log(`[SyncService] Synced settings from ${targetUrl}`, data);
                    return data;
                }
            }
            return null;
        } catch (error) {
            console.error('[SyncService] Failed to sync settings:', error);
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
                    console.log(`[SyncService] Synced shift event to ${targetUrl}`);
                    return true;
                }
            }

            // Queue offline if direct push failed or offline
            console.log('[SyncService] Network unreachable right now. Enqueueing shift event to durable disk queue.');
            await offlineQueueService.enqueue('SHIFT_EVENT', '/api/shifts', 'POST', shift, 'HIGH');
            return false;
        } catch (error) {
            console.error('[SyncService] Failed to push shift event, queueing offline:', error);
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
                    console.log(`[SyncService] Enrolled face vector via ${targetUrl}`);
                    return true;
                }
            }

            console.log('[SyncService] Enqueueing face enrollment to durable disk queue.');
            await offlineQueueService.enqueue('FACE_ENROLL', '/api/photographers/enroll-face', 'POST', payload, 'HIGH');
            return false;
        } catch (error) {
            console.error('[SyncService] Failed to enroll face vector, queueing offline:', error);
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
            console.error('[SyncService] Failed to fetch face vector:', error);
            return null;
        }
    }
}

export const syncService = new SyncService();
