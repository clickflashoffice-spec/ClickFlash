import { pb } from './pb';
import { logger } from '../utils/logger';

/**
 * SyncService Class
 * 
 * Synchronizes data between Touch Kiosk (Local DB on port 8091) and Master Station (Remote DB on port 8090).
 * 
 * Features:
 * - Bidirectional sync: Push orders to Master, pull albums from Master
 * - Automatic sync loop with configurable interval
 * - Photo file synchronization (downloads JPEG files from Master)
 * - Conflict resolution and duplicate detection
 * - Health check before sync operations
 * - Error handling with logging
 * 
 * Sync Flow:
 * 1. Push pending orders from Touch to Master
 * 2. Pull finalized albums from Master to Touch
 * 3. Download and sync photo files (JPEG) for each album
 * 
 * @class SyncService
 */
class SyncService {
    private masterUrl: string | null = null;
    private isSyncing = false;
    private syncInterval: number | null = null;

    constructor() {
        const savedIp = localStorage.getItem('masterLocalIPAddress');
        if (savedIp) {
            // Master always runs on 8090
            this.masterUrl = `http://${savedIp}:8090`;
        }
    }

    /**
     * Update the Master Station IP address
     * 
     * @param {string} ip - IP address of the Master Station
     */
    public updateMasterIp(ip: string) {
        this.masterUrl = `http://${ip}:8090`;
        localStorage.setItem('masterLocalIPAddress', ip);
        logger.info("[SyncService] Master IP updated", { ip, masterUrl: this.masterUrl });
    }

    /**
     * Start the automatic sync loop
     * 
     * Runs sync immediately, then at regular intervals.
     * 
     * @param {number} intervalMs - Sync interval in milliseconds (default: 15000 = 15 seconds)
     */
    public startSyncLoop(intervalMs = 15000) {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.sync(); // Initial run
        this.syncInterval = window.setInterval(() => this.sync(), intervalMs);
        logger.info("[SyncService] Started sync loop", { intervalMs });
    }

    /**
     * Stop the automatic sync loop
     */
    public stopSyncLoop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            logger.info("[SyncService] Stopped sync loop");
        }
    }

    /**
     * Perform a single sync operation
     * 
     * Syncs data between Touch Kiosk and Master Station:
     * - Pushes pending orders to Master
     * - Pulls finalized albums and photos from Master
     * 
     * @returns {Promise<void>}
     */
    public async sync() {
        if (!this.masterUrl || this.isSyncing) return;
        this.isSyncing = true;

        try {
            // Check if Master is reachable
            const healthRes = await fetch(`${this.masterUrl}/api/health`).catch(() => null);
            if (!healthRes || !healthRes.ok) {
                logger.debug("[SyncService] Master unavailable", { masterUrl: this.masterUrl });
                return;
            }

            await this.pushOrdersToMaster();
            await this.pullAlbumsFromMaster();

        } catch (e) {
            logger.warn("[SyncService] Sync failed/skipped", { error: e instanceof Error ? e.message : String(e), masterUrl: this.masterUrl }, e instanceof Error ? e : undefined);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Push pending orders from Touch Kiosk to Master Station
     * 
     * Finds all orders with status 'Pending' and sends them to Master.
     * Updates order status to 'Synced' after successful push.
     * 
     * @private
     * @returns {Promise<void>}
     */
    private async pushOrdersToMaster() {
        // In our local DB architecture, orders are stored in 'orders' collection.
        // We find orders that are 'Pending' (assuming newly created ones).
        const pendingOrders = await pb.collection('orders').getFullList({
            filter: `status = "Pending"`
        });

        for (const order of pendingOrders) {
            try {
                // Send to Master
                const res = await fetch(`${this.masterUrl}/api/collections/orders/records`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...order,
                        // Ensure we don't conflict IDs if Master generates them
                    })
                });

                if (res.ok) {
                    // Mark as synced locally
                    await pb.collection('orders').update(order.id, { status: 'Synced' });
                    logger.info(`[SyncService] Pushed order to master`, { orderId: order.id });
                }
            } catch (e) {
                logger.error(`[SyncService] Failed to push order`, { orderId: order.id }, e instanceof Error ? e : undefined);
            }
        }
    }

    /**
     * Pull finalized albums and photos from Master Station to Touch Kiosk
     * 
     * Fetches finalized albums from Master, creates them locally if they don't exist,
     * and downloads all associated photo files (JPEG) from Master to Touch PC.
     * 
     * Process:
     * 1. Fetch finalized albums from Master
     * 2. For each album, check if it exists locally
     * 3. If not, create the album locally
     * 4. Download all photos for the album (JPEG files)
     * 5. Upload photos to Touch backend (saves to Touch PC)
     * 
     * @private
     * @returns {Promise<void>}
     */
    private async pullAlbumsFromMaster() {
        // Fetch finalized albums from Master
        const res = await fetch(`${this.masterUrl}/api/collections/albums/records?filter=(status='Finalized')&expand=photos_via_album`);
        if (!res.ok) return;

        const data = await res.json();
        const masterAlbums = data.items || [];

        for (const rAlbum of masterAlbums) {
            try {
                // Check if exists locally
                const localExists = await pb.collection('albums').getOne(rAlbum.id).catch(() => null);

                if (!localExists) {
                    logger.info(`[SyncService] Pulling new album`, { albumId: rAlbum.id, albumTitle: rAlbum.title });

                    // Create Album locally
                    await pb.collection('albums').create({
                        id: rAlbum.id,
                        title: rAlbum.title,
                        date: rAlbum.date,
                        photographerId: rAlbum.photographerId,
                        roomNumber: rAlbum.roomNumber,
                        status: rAlbum.status
                    });

                    // Process Photos - Download JPEG files from Master and copy to Touch PC
                    const photos = rAlbum.expand?.photos_via_album || [];
                    for (const rPhoto of photos) {
                        try {
                            // Check if photo already exists locally to avoid re-downloading
                            const localPhotoExists = await pb.collection('photos').getOne(rPhoto.id).catch(() => null);
                            if (localPhotoExists) {
                                logger.debug(`[SyncService] Photo already exists locally, skipping`, { photoId: rPhoto.id });
                                continue;
                            }

                            // Construct the correct URL to download the JPEG file from Master
                            // Photo URL format in DB: relative path like "albumId/photoId.jpg" or just filename
                            // Master serves files via: /api/files/photos/{photoId}/{relativePath}
                            let photoPath = rPhoto.url || rPhoto.storagePath || rPhoto.originalFilename || '';
                            
                            // If photoPath is empty or doesn't look like a path, try to construct it
                            if (!photoPath || (!photoPath.includes('/') && !photoPath.includes('.'))) {
                                // Try to construct path: albumId/photoId.jpg
                                photoPath = `${rAlbum.id}/${rPhoto.id}.jpg`;
                            }
                            
                            // Construct download URL - Master serves files at /api/files/photos/{photoId}/{path}
                            const remoteUrl = `${this.masterUrl}/api/files/photos/${rPhoto.id}/${encodeURIComponent(photoPath)}`;

                            logger.info(`[SyncService] Downloading JPEG file from Master`, { 
                                photoId: rPhoto.id, 
                                remoteUrl,
                                photoPath,
                                albumId: rAlbum.id 
                            });

                            // Download the JPEG file from Master over local network
                            // The Master backend allows local network access without authentication for sync
                            let imgRes;
                            try {
                                imgRes = await fetch(remoteUrl, {
                                    method: 'GET',
                                    // Large JPEG files may take time, browser default timeout applies
                                });
                            } catch (fetchError) {
                                logger.error(`[SyncService] Failed to fetch photo`, { 
                                    photoId: rPhoto.id,
                                    error: fetchError instanceof Error ? fetchError.message : String(fetchError),
                                    remoteUrl
                                });
                                continue;
                            }
                            
                            if (!imgRes.ok) {
                                logger.warn(`[SyncService] Failed to download photo`, { 
                                    photoId: rPhoto.id, 
                                    status: imgRes.status,
                                    statusText: imgRes.statusText,
                                    remoteUrl
                                });
                                continue;
                            }

                            // Get the JPEG file as a blob
                            const blob = await imgRes.blob();
                            
                            // Extract filename - prefer original filename, otherwise use photo ID
                            let filename = rPhoto.originalFilename || photoPath.split('/').pop() || `${rPhoto.id}.jpg`;
                            // Ensure filename has .jpg extension
                            if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
                                filename = `${filename}.jpg`;
                            }
                            
                            logger.info(`[SyncService] JPEG file downloaded successfully`, { 
                                photoId: rPhoto.id,
                                filename,
                                size: blob.size,
                                type: blob.type
                            });

                            // Upload the JPEG file to Touch backend (which will save it locally to Touch PC)
                            const formData = new FormData();
                            formData.append('title', rPhoto.title || filename);
                            formData.append('albumId', rAlbum.id);
                            formData.append('photographerId', String(rAlbum.photographerId || 0));
                            formData.append('id', rPhoto.id); // Preserve photo ID for consistency
                            formData.append('url', blob, filename); // JPEG file - will be saved to Touch PC's upload directory

                            // Create photo record in Touch database (backend will save the JPEG file)
                            const createdPhoto = await pb.collection('photos').create(formData);
                            
                            logger.info(`[SyncService] JPEG file synced to Touch PC successfully`, { 
                                photoId: rPhoto.id,
                                localPhotoId: createdPhoto.id,
                                albumId: rAlbum.id,
                                filename,
                                size: blob.size
                            });
                        } catch (photoError) {
                            logger.error(`[SyncService] Failed to sync photo`, { 
                                photoId: rPhoto.id,
                                albumId: rAlbum.id,
                                error: photoError instanceof Error ? photoError.message : String(photoError)
                            }, photoError instanceof Error ? photoError : undefined);
                            // Continue with next photo even if one fails
                        }
                    }
                }
            } catch (e) {
                logger.error(`[SyncService] Failed to sync album`, { albumId: rAlbum.id }, e instanceof Error ? e : undefined);
            }
        }
    }
}

export const syncService = new SyncService();
