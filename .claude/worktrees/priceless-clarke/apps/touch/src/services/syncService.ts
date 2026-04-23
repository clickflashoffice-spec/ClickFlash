import { pb } from './pb';
import { logger } from '../utils/logger';
import { syncCheckpointService, SyncCheckpoint } from './syncCheckpointService';

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
interface FailedPhotoTransfer {
    photoId: string;
    albumId: string;
    remoteUrl: string;
    photoPath: string;
    retryCount: number;
    lastError?: string;
}

// Helper to reliably detect network errors across browsers (duplicated to avoid circular deps if Utils not avail)
const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        error instanceof TypeError && (
            msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('failed to fetch') ||
            msg.includes('connection refused')
        )
    ) || msg.includes('err_connection_refused');
};

interface SyncProgress {
    albumsProcessed: number;
    photosProcessed: number;
    photosTotal: number;
    bytesTransferred: number;
    startTime: number;
    currentAlbum?: string;
}

class SyncService {
    private masterUrl: string | null = null;
    private isSyncing = false;
    private syncInterval: number | null = null;
    private processedPhotoIdsClearInterval: number | null = null; // Track interval for cleanup
    private failedPhotoQueue: FailedPhotoTransfer[] = [];
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly PHOTO_DOWNLOAD_TIMEOUT = 120000; // 2 minutes for large photos
    private readonly RETRY_BACKOFF_BASE = 1000; // 1 second base delay
    private readonly MAX_CONCURRENT_DOWNLOADS = 3; // Process 3 photos at a time
    private readonly BATCH_SIZE = 5; // Process albums in batches of 5
    private syncProgress: SyncProgress | null = null;
    private readonly processedPhotoIds = new Set<string>(); // Track processed photos to prevent duplicates
    private readonly realtimeReceivedAlbums = new Set<string>(); // Track albums received via real-time to skip in sync

    /**
     * Mark an album as received via real-time (to skip in sync)
     */
    public markAlbumReceivedViaRealtime(albumId: string) {
        this.realtimeReceivedAlbums.add(albumId);
        logger.debug("[SyncService] Marked album as received via real-time", { albumId });
    }

    /**
     * Clear real-time received albums tracking (called periodically or on demand)
     */
    public clearRealtimeReceivedAlbums() {
        this.realtimeReceivedAlbums.clear();
        logger.debug("[SyncService] Cleared real-time received albums tracking");
    }

    constructor() {
        const savedIp = localStorage.getItem('masterLocalIPAddress');
        if (savedIp) {
            // Master default port is 8090
            this.masterUrl = `http://${savedIp}:8090`;
        }

        // Load failed photo queue from localStorage on initialization
        this.loadFailedPhotoQueue();

        // Clear processed photos set periodically (every hour) to allow re-processing if needed
        this.processedPhotoIdsClearInterval = window.setInterval(() => {
            this.processedPhotoIds.clear();
        }, 3600000); // 1 hour
    }

    /**
     * Load failed photo queue from localStorage
     */
    private loadFailedPhotoQueue() {
        try {
            const saved = localStorage.getItem('syncServiceFailedPhotos');
            if (saved) {
                this.failedPhotoQueue = JSON.parse(saved);
                logger.info("[SyncService] Loaded failed photo queue", { count: this.failedPhotoQueue.length });
            }
        } catch (e) {
            logger.warn("[SyncService] Failed to load failed photo queue", { error: e instanceof Error ? e.message : String(e) });
            this.failedPhotoQueue = [];
        }
    }

    /**
     * Save failed photo queue to localStorage
     */
    private saveFailedPhotoQueue() {
        try {
            localStorage.setItem('syncServiceFailedPhotos', JSON.stringify(this.failedPhotoQueue));
        } catch (e) {
            logger.warn("[SyncService] Failed to save failed photo queue", { error: e instanceof Error ? e.message : String(e) });
        }
    }

    /**
     * Add photo to retry queue with exponential backoff
     */
    private addToRetryQueue(photo: FailedPhotoTransfer) {
        // Check if already in queue
        const existingIndex = this.failedPhotoQueue.findIndex(p => p.photoId === photo.photoId);
        if (existingIndex >= 0) {
            this.failedPhotoQueue[existingIndex] = photo;
        } else {
            this.failedPhotoQueue.push(photo);
        }
        this.saveFailedPhotoQueue();
        logger.info("[SyncService] Added photo to retry queue", { photoId: photo.photoId, retryCount: photo.retryCount });
    }

    /**
     * Remove photo from retry queue (successful transfer)
     */
    private removeFromRetryQueue(photoId: string) {
        this.failedPhotoQueue = this.failedPhotoQueue.filter(p => p.photoId !== photoId);
        this.saveFailedPhotoQueue();
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
        // Interval logic removed to favor pure realtime/event-driven sync.
        // We still perform one initial sync to ensure baseline data is pulled.
        this.sync();
        logger.info("[SyncService] Initial sync performed (auto-polling disabled)");
    }

    /**
     * Stop the automatic sync loop
     */
    public stopSyncLoop() {
        // No-op as syncInterval is removed
        // Cleanup processed photos clear interval
        if (this.processedPhotoIdsClearInterval !== null) {
            clearInterval(this.processedPhotoIdsClearInterval);
            this.processedPhotoIdsClearInterval = null;
        }
    }

    /**
     * Perform a single sync operation
     * 
     * Syncs data between Touch Kiosk and Master Station:
     * - Pushes pending orders to Master
     * - Pulls finalized albums and photos from Master
     * - Retries failed photo transfers from previous attempts
     * 
     * @returns {Promise<void>}
     */
    public async sync() {
        if (!this.masterUrl || this.isSyncing) return;
        this.isSyncing = true;

        try {
            // Check if Master is reachable
            // Heartbeat / Health Check
            // We use a dedicated heartbeat endpoint to register presence + check health
            const kioskId = localStorage.getItem('kioskId') || 'unknown';
            const healthRes = await fetch(`${this.masterUrl}/api/kiosk/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kioskId,
                    ip: 'auto', // Master will detect IP
                    status: 'Syncing',
                    version: '1.0'
                }),
                signal: AbortSignal.timeout(5000)
            }).catch(() => null);

            if (!healthRes || !healthRes.ok) {
                logger.debug("[SyncService] Master unavailable (Heartbeat failed)", { masterUrl: this.masterUrl });
                return;
            }

            await this.pushOrdersToMaster();
            await this.pullAlbumsFromMaster();

            // Retry failed photo transfers
            if (this.failedPhotoQueue.length > 0) {
                await this.retryFailedPhotos();
            }

        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            if (isNetworkError(e)) {
                logger.debug("[SyncService] Sync skipped (Network unavailable)", { masterUrl: this.masterUrl, error: errorMsg });
            } else {
                logger.warn("[SyncService] Sync failed", { error: errorMsg, masterUrl: this.masterUrl });
            }
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Retry failed photo transfers from the queue
     * Uses exponential backoff based on retry count
     * 
     * @private
     * @returns {Promise<void>}
     */
    private async retryFailedPhotos() {
        const photosToRetry = [...this.failedPhotoQueue];

        for (const photo of photosToRetry) {
            // Exponential backoff: wait longer for each retry
            const delay = this.RETRY_BACKOFF_BASE * Math.pow(2, photo.retryCount);

            if (photo.retryCount >= this.MAX_RETRY_ATTEMPTS) {
                logger.error("[SyncService] Photo exceeded max retry attempts, removing from queue", {
                    photoId: photo.photoId,
                    retryCount: photo.retryCount,
                    lastError: photo.lastError
                });
                this.removeFromRetryQueue(photo.photoId);
                continue;
            }

            // Wait before retrying (except first retry)
            if (photo.retryCount > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                // Extract photo metadata from existing record if available
                let photoTitle: string | undefined;
                let originalFilename: string | undefined;
                let photographerId = 0;

                try {
                    const album = await pb.collection('albums').getOne(photo.albumId).catch(() => null);
                    if (album) {
                        photographerId = album.photographerId || 0;
                    }
                } catch (e) {
                    // Use defaults if album fetch fails
                }

                const success = await this.downloadAndSavePhoto(
                    photo.albumId,
                    photo.photoId,
                    photo.remoteUrl,
                    photo.photoPath,
                    photoTitle,
                    originalFilename,
                    photographerId
                );

                if (success) {
                    this.removeFromRetryQueue(photo.photoId);
                    logger.info("[SyncService] Successfully retried failed photo", { photoId: photo.photoId, retryCount: photo.retryCount });
                } else {
                    photo.retryCount++;
                    photo.lastError = 'Download failed';
                    this.addToRetryQueue(photo);
                }
            } catch (error) {
                photo.retryCount++;
                photo.lastError = error instanceof Error ? error.message : String(error);
                this.addToRetryQueue(photo);
                logger.warn("[SyncService] Retry failed for photo", {
                    photoId: photo.photoId,
                    retryCount: photo.retryCount,
                    error: photo.lastError
                });
            }
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
                logger.error(`[SyncService] Failed to push order`, e instanceof Error ? e : undefined, { orderId: order.id });
            }
        }
    }

    /**
     * Pull finalized albums and photos from Master Station to Touch Kiosk
     * 
     * Fetches finalized albums from Master, creates them locally if they don't exist,
     * and downloads all associated photo files (JPEG) from Master to Touch PC.
     * 
     * Enhanced with:
     * - Batch processing for albums
     * - Concurrent photo downloads with limits
     * - Duplicate detection
     * - Progress tracking
     * - Checkpoint/resume capability
     * 
     * Process:
     * 1. Check for existing checkpoint and resume if available
     * 2. Fetch finalized albums from Master
     * 3. Filter out already processed albums (from checkpoint)
     * 4. Process albums in batches
     * 5. For each album, check if it exists locally
     * 6. If not, create the album locally
     * 7. Download all photos for the album (JPEG files) with concurrent limits
     * 8. Upload photos to Touch backend (saves to Touch PC)
     * 9. Save checkpoint after each album
     * 10. Clear checkpoint on successful completion
     * 
     * @private
     * @returns {Promise<void>}
     */
    private async pullAlbumsFromMaster() {
        try {
            // Check for existing checkpoint
            const checkpoint = syncCheckpointService.loadCheckpoint();
            const isResume = checkpoint !== null;

            if (isResume) {
                logger.info("[SyncService] Resuming sync from checkpoint", {
                    albumsProcessed: checkpoint.albumsProcessed.length,
                    photosProcessed: checkpoint.photosProcessed.length
                });
            }

            // Fetch finalized albums from Master
            const res = await fetch(`${this.masterUrl}/api/collections/albums/records?filter=(status='Finalized')&expand=photos_via_album`);
            if (!res.ok) {
                logger.warn("[SyncService] Failed to fetch albums from Master", { status: res.status, statusText: res.statusText });
                return;
            }

            const data = await res.json();
            let masterAlbums = data.items || [];

            if (masterAlbums.length === 0) {
                logger.debug("[SyncService] No finalized albums to sync");
                // Clear checkpoint if no albums to sync
                if (checkpoint) {
                    syncCheckpointService.clearCheckpoint();
                }
                return;
            }

            // Filter out already processed albums if resuming
            if (isResume && checkpoint) {
                const processedCount = masterAlbums.length;
                masterAlbums = masterAlbums.filter((album: any) =>
                    !checkpoint.albumsProcessed.includes(album.id)
                );
                logger.info("[SyncService] Filtered processed albums", {
                    total: processedCount,
                    remaining: masterAlbums.length,
                    skipped: processedCount - masterAlbums.length
                });
            }

            // Initialize progress tracking
            const totalPhotos = masterAlbums.reduce((sum: number, album: any) =>
                sum + (album.expand?.photos_via_album?.length || 0), 0);

            const startTime = checkpoint?.startTime || Date.now();
            const initialAlbumsProcessed = checkpoint?.albumsProcessed.length || 0;
            const initialPhotosProcessed = checkpoint?.photosProcessed.length || 0;
            const initialBytesTransferred = checkpoint?.bytesTransferred || 0;

            this.syncProgress = {
                albumsProcessed: initialAlbumsProcessed,
                photosProcessed: initialPhotosProcessed,
                photosTotal: totalPhotos + initialPhotosProcessed,
                bytesTransferred: initialBytesTransferred,
                startTime
            };

            // Create or update checkpoint
            if (!checkpoint) {
                syncCheckpointService.saveCheckpoint({
                    timestamp: Date.now(),
                    albumsProcessed: [],
                    photosProcessed: [],
                    totalAlbums: masterAlbums.length,
                    totalPhotos,
                    bytesTransferred: 0,
                    startTime,
                    syncType: 'full'
                });
            }

            logger.info("[SyncService] Starting album sync", {
                albumCount: masterAlbums.length,
                totalPhotos,
                isResume
            });

            // Process albums in batches
            for (let i = 0; i < masterAlbums.length; i += this.BATCH_SIZE) {
                const batch = masterAlbums.slice(i, i + this.BATCH_SIZE);
                await Promise.all(batch.map((album: any) => this.processAlbum(album)));

                // Save checkpoint after each batch
                if (this.syncProgress) {
                    syncCheckpointService.updateCheckpoint({
                        albumsProcessed: Array.from(new Set([
                            ...(checkpoint?.albumsProcessed || []),
                            ...batch.map((a: any) => a.id)
                        ])),
                        photosProcessed: Array.from(new Set([
                            ...(checkpoint?.photosProcessed || []),
                            ...Array.from(this.processedPhotoIds)
                        ])),
                        bytesTransferred: this.syncProgress.bytesTransferred
                    });
                }
            }

            // Log sync completion
            if (this.syncProgress) {
                const duration = Date.now() - this.syncProgress.startTime;
                logger.info("[SyncService] Album sync completed", {
                    albumsProcessed: this.syncProgress.albumsProcessed,
                    photosProcessed: this.syncProgress.photosProcessed,
                    photosTotal: this.syncProgress.photosTotal,
                    bytesTransferred: this.syncProgress.bytesTransferred,
                    durationMs: duration
                });

                // Clear checkpoint on successful completion
                syncCheckpointService.clearCheckpoint();
                this.syncProgress = null;
            }
        } catch (e) {
            logger.error("[SyncService] Failed to pull albums from Master", e instanceof Error ? e : undefined, {});
            // Don't clear checkpoint on error - allows resume on next sync
        }
    }

    /**
     * Process a single album (create if needed, download photos)
     * 
     * @private
     * @param rAlbum - Album record from Master
     * @returns {Promise<void>}
     */
    private async processAlbum(rAlbum: any): Promise<void> {
        try {
            // Skip albums that were already received via real-time to prevent duplicates
            if (this.realtimeReceivedAlbums.has(rAlbum.id)) {
                logger.debug("[SyncService] Skipping album received via real-time", { albumId: rAlbum.id });
                return;
            }

            // Check if album exists locally
            const localExists = await pb.collection('albums').getOne(rAlbum.id).catch(() => null);

            // Skip if album was already processed (from checkpoint)
            if (syncCheckpointService.isAlbumProcessed(rAlbum.id)) {
                logger.debug("[SyncService] Album already processed (checkpoint)", { albumId: rAlbum.id });
                return;
            }

            if (!localExists) {
                logger.info(`[SyncService] Pulling new album`, { albumId: rAlbum.id, albumTitle: rAlbum.title });

                // Create Album locally
                await pb.collection('albums').create({
                    id: rAlbum.id,
                    title: rAlbum.title,
                    date: rAlbum.date,
                    photographerId: rAlbum.photographerId,
                    roomNumber: rAlbum.roomNumber,
                    status: rAlbum.status,
                    kiosk_ready: 1
                });

                if (this.syncProgress) {
                    this.syncProgress.albumsProcessed++;
                    this.syncProgress.currentAlbum = rAlbum.id;
                }
            } else {
                logger.debug(`[SyncService] Album already exists locally`, { albumId: rAlbum.id });
                // Ensure kiosk_ready is set to 1 for existing albums
                await pb.collection('albums').update(rAlbum.id, { kiosk_ready: 1 });
            }

            // Mark album as processed in checkpoint
            syncCheckpointService.markAlbumProcessed(rAlbum.id);

            // Process Photos - Download JPEG files from Master and copy to Touch PC
            const photos = rAlbum.expand?.photos_via_album || [];
            if (photos.length > 0) {
                await this.processPhotosBatch(rAlbum, photos);
            }
        } catch (e) {
            logger.error(`[SyncService] Failed to process album`, e instanceof Error ? e : undefined, { albumId: rAlbum.id });
        }
    }

    /**
     * Process photos in batches with concurrent download limits
     * 
     * @private
     * @param album - Album record
     * @param photos - Array of photo records
     * @returns {Promise<void>}
     */
    private async processPhotosBatch(album: any, photos: any[]): Promise<void> {
        // Filter out photos that are already processed (duplicate detection)
        const photosToProcess = photos.filter(photo => {
            if (this.processedPhotoIds.has(photo.id)) {
                logger.debug("[SyncService] Photo already processed in this session", { photoId: photo.id });
                return false;
            }
            return true;
        });

        // Process photos in concurrent batches
        for (let i = 0; i < photosToProcess.length; i += this.MAX_CONCURRENT_DOWNLOADS) {
            const batch = photosToProcess.slice(i, i + this.MAX_CONCURRENT_DOWNLOADS);

            await Promise.allSettled(
                batch.map(photo => this.processPhoto(album, photo))
            );
        }
    }

    /**
     * Process a single photo (download and save)
     * 
     * @private
     * @param album - Album record
     * @param photo - Photo record
     * @returns {Promise<void>}
     */
    private async processPhoto(album: any, photo: any): Promise<void> {
        // Skip if photo was already processed (from checkpoint)
        if (syncCheckpointService.isPhotoProcessed(photo.id)) {
            logger.debug("[SyncService] Photo already processed (checkpoint)", { photoId: photo.id });
            this.processedPhotoIds.add(photo.id);
            if (this.syncProgress) {
                this.syncProgress.photosProcessed++;
            }
            return;
        }

        // Check if photo already exists locally (duplicate detection)
        try {
            const localPhotoExists = await pb.collection('photos').getOne(photo.id).catch(() => null);
            if (localPhotoExists) {
                logger.debug(`[SyncService] Photo already exists locally, skipping`, { photoId: photo.id });
                this.processedPhotoIds.add(photo.id);
                syncCheckpointService.markPhotoProcessed(photo.id);
                if (this.syncProgress) {
                    this.syncProgress.photosProcessed++;
                }
                return;
            }
        } catch (checkError) {
            logger.warn("[SyncService] Error checking if photo exists", { photoId: photo.id });
        }

        // Construct photo URL with multiple fallback strategies
        let photoPath = photo.url || photo.storagePath || photo.originalFilename || '';

        // Fallback strategies for photo path
        if (!photoPath || (!photoPath.includes('/') && !photoPath.includes('.'))) {
            // Fix: Do not prepend album.id, just use photo.id with jpg extension
            // Standard PB pattern is just the filename
            photoPath = `${photo.id}.jpg`;
        }

        // Try multiple URL patterns
        // Standard PB: /api/files/COLLECTION/RECORD_ID/FILENAME
        const urlPatterns = [
            `${this.masterUrl}/api/files/photos/${photo.id}/${encodeURIComponent(photoPath)}`,
            // Legacy/Alternative pattern checks
            photo.url?.startsWith('http') ? photo.url : null,
        ].filter(Boolean) as string[];

        let success = false;
        let lastError: string | undefined;

        // Try each URL pattern
        for (const remoteUrl of urlPatterns) {
            try {
                success = await this.downloadAndSavePhoto(
                    album.id,
                    photo.id,
                    remoteUrl,
                    photoPath,
                    photo.title,
                    photo.originalFilename,
                    album.photographerId || 0
                );

                if (success) {
                    this.processedPhotoIds.add(photo.id);
                    syncCheckpointService.markPhotoProcessed(photo.id);
                    if (this.syncProgress) {
                        this.syncProgress.photosProcessed++;
                    }
                    return;
                }
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
                logger.debug("[SyncService] URL pattern failed, trying next", {
                    photoId: photo.id,
                    remoteUrl,
                    error: lastError
                });
            }
        }

        // All URL patterns failed - add to retry queue
        logger.warn("[SyncService] All URL patterns failed for photo", {
            photoId: photo.id,
            albumId: album.id,
            urlPatterns
        });

        this.addToRetryQueue({
            photoId: photo.id,
            albumId: album.id,
            remoteUrl: urlPatterns[0] || '',
            photoPath,
            retryCount: 0,
            lastError: lastError || 'All URL patterns failed'
        });
    }

    /**
     * Download a photo from Master and save it to Touch backend
     * 
     * @private
     * @param albumId - Album ID
     * @param photoId - Photo ID
     * @param remoteUrl - Full URL to download photo from Master
     * @param photoPath - Relative path of the photo
     * @param photoTitle - Photo title (optional)
     * @param originalFilename - Original filename (optional)
     * @param photographerId - Photographer ID
     * @returns Promise<boolean> - true if successful, false otherwise
     */
    private async downloadAndSavePhoto(
        albumId: string,
        photoId: string,
        remoteUrl: string,
        photoPath: string,
        photoTitle?: string,
        originalFilename?: string,
        photographerId: number = 0
    ): Promise<boolean> {
        try {
            logger.info(`[SyncService] Requesting backend to pull photo`, {
                photoId,
                remoteUrl,
                photoPath,
                albumId
            });

            // Extract filename
            let filename = originalFilename || photoPath.split('/').pop() || `${photoId}.jpg`;
            // Ensure filename has .jpg extension
            if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
                filename = `${filename}.jpg`;
            }

            // Call the backend to pull the file directly
            // We use the local backend URL from pb instance
            const baseUrl = pb.baseUrlValue || 'http://127.0.0.1:8092';

            const res = await fetch(`${baseUrl}/api/sync/pull-photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pb_auth_token') || ''}`
                },
                body: JSON.stringify({
                    url: remoteUrl,
                    filename: filename,
                    photoId: photoId,
                    albumId: albumId,
                    photographerId: photographerId,
                    title: photoTitle || filename
                })
            });

            if (!res.ok) {
                const errorText = await res.text();
                logger.warn(`[SyncService] Backend failed to pull photo`, {
                    photoId,
                    status: res.status,
                    error: errorText,
                    remoteUrl
                });
                return false;
            }

            const result = await res.json();

            logger.info(`[SyncService] Photo pulled by backend successfully`, {
                photoId,
                size: result.size
            });

            // Update progress tracking
            if (this.syncProgress) {
                this.syncProgress.bytesTransferred += (result.size || 0);
            }

            return true;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            // Check for network error reaching our OWN backend
            if (isNetworkError(error)) {
                logger.error(`[SyncService] Failed to contact local backend for photo pull`, { error: errorMsg, photoId });
            } else {
                logger.error(`[SyncService] Error requesting photo pull`, { error: errorMsg, photoId });
            }
            return false;
        }
    }

}

export const syncService = new SyncService();
