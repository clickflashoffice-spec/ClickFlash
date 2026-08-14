import { pb } from './pb';
import { logger } from '../utils/logger';
import { syncCheckpointService, SyncCheckpoint } from './syncCheckpointService';
import { db } from './db';
import { connectivityService } from './connectivityService';

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
 * - OFFLINE-FIRST: Orders are queued persistently and pushed when connectivity returns
 * - IDEMPOTENCY: clientMutationId prevents duplicate orders on retries
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

interface SyncProgress {
    albumsProcessed: number;
    photosProcessed: number;
    photosTotal: number;
    bytesTransferred: number;
    startTime: number;
    currentAlbum?: string;
}

interface SyncState {
    isSyncing: boolean;
    lastSyncAt: number | null;
    lastSyncError: string | null;
    pendingOrdersCount: number;
}

// Helper to reliably detect network errors across browsers
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

class SyncService {
    private masterUrl: string | null = null;
    private isSyncing = false;
    private syncInterval: number | null = null;
    private processedPhotoIdsClearInterval: number | null = null;
    private failedPhotoQueue: FailedPhotoTransfer[] = [];
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly PHOTO_DOWNLOAD_TIMEOUT = 120000;
    private readonly RETRY_BACKOFF_BASE = 1000;
    private readonly MAX_CONCURRENT_DOWNLOADS = 3;
    private readonly BATCH_SIZE = 5;
    private syncProgress: SyncProgress | null = null;
    private readonly processedPhotoIds = new Set<string>();
    private readonly realtimeReceivedAlbums = new Set<string>();

    // Observable sync state for UI components
    private syncState: SyncState = {
        isSyncing: false,
        lastSyncAt: null,
        lastSyncError: null,
        pendingOrdersCount: 0,
    };
    private stateListeners: Array<(state: SyncState) => void> = [];

    public markAlbumReceivedViaRealtime(albumId: string) {
        this.realtimeReceivedAlbums.add(albumId);
        logger.debug("[SyncService] Marked album as received via real-time", { albumId });
    }

    public clearRealtimeReceivedAlbums() {
        this.realtimeReceivedAlbums.clear();
        logger.debug("[SyncService] Cleared real-time received albums tracking");
    }

    private syncTimer: ReturnType<typeof setTimeout> | null = null;
    private currentInterval = 15000;
    private baseInterval = 15000;
    private readonly MAX_INTERVAL = 300000; // 5 minutes
    private readonly BACKOFF_FACTOR = 2;
    private consecutiveSyncFailures = 0;
    private connectivityUnsubscribe: (() => void) | null = null;

    constructor() {
        const savedIp = localStorage.getItem('masterLocalIPAddress');
        if (savedIp) {
            this.masterUrl = `http://${savedIp}:8090`;
        }

        this.loadFailedPhotoQueue();

        this.processedPhotoIdsClearInterval = window.setInterval(() => {
            this.processedPhotoIds.clear();
        }, 3600000);
    }

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

    private saveFailedPhotoQueue() {
        try {
            localStorage.setItem('syncServiceFailedPhotos', JSON.stringify(this.failedPhotoQueue));
        } catch (e) {
            logger.warn("[SyncService] Failed to save failed photo queue", { error: e instanceof Error ? e.message : String(e) });
        }
    }

    private addToRetryQueue(photo: FailedPhotoTransfer) {
        const existingIndex = this.failedPhotoQueue.findIndex(p => p.photoId === photo.photoId);
        if (existingIndex >= 0) {
            this.failedPhotoQueue[existingIndex] = photo;
        } else {
            this.failedPhotoQueue.push(photo);
        }
        this.saveFailedPhotoQueue();
        logger.info("[SyncService] Added photo to retry queue", { photoId: photo.photoId, retryCount: photo.retryCount });
    }

    private removeFromRetryQueue(photoId: string) {
        this.failedPhotoQueue = this.failedPhotoQueue.filter(p => p.photoId !== photoId);
        this.saveFailedPhotoQueue();
    }

    public updateMasterIp(ip: string) {
        this.masterUrl = `http://${ip}:8090`;
        localStorage.setItem('masterLocalIPAddress', ip);
        logger.info("[SyncService] Master IP updated", { ip, masterUrl: this.masterUrl });
    }

    public startSyncLoop(intervalMs = 15000) {
        this.baseInterval = intervalMs;
        this.currentInterval = intervalMs;
        this.scheduleNextSync(0); // Immediate first sync
        logger.info("[SyncService] Auto-polling started", { baseInterval: intervalMs });

        // Start proactive connectivity detection
        connectivityService.updateMasterUrl(this.masterUrl?.replace('http://', '').replace(':8090', '') || '');
        connectivityService.start();
        this.connectivityUnsubscribe = connectivityService.subscribe((isOnline) => {
            if (isOnline) {
                logger.info("[SyncService] Master connectivity restored — triggering immediate sync");
                this.consecutiveSyncFailures = 0;
                this.currentInterval = this.baseInterval;
                this.scheduleNextSync(0);
            } else {
                logger.info("[SyncService] Master connectivity lost — sync will resume when online");
                this.setSyncState({ lastSyncError: 'Master unreachable' });
            }
        });
    }

    private scheduleNextSync(delayMs?: number) {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        const delay = delayMs ?? this.currentInterval;
        this.syncTimer = setTimeout(() => this.runSyncCycle(), delay);
    }

    private async runSyncCycle() {
        if (!this.masterUrl || this.isSyncing) {
            this.scheduleNextSync();
            return;
        }

        try {
            await this.sync();
            // Success: reset backoff
            this.consecutiveSyncFailures = 0;
            this.currentInterval = this.baseInterval;
        } catch (e) {
            this.consecutiveSyncFailures++;
            const nextInterval = Math.min(
                this.MAX_INTERVAL,
                this.baseInterval * Math.pow(this.BACKOFF_FACTOR, this.consecutiveSyncFailures)
            );
            this.currentInterval = nextInterval;
            logger.warn("[SyncService] Sync cycle failed, increasing backoff", {
                consecutiveFailures: this.consecutiveSyncFailures,
                nextIntervalMs: nextInterval,
            });
        } finally {
            this.scheduleNextSync();
        }
    }

    public stopSyncLoop() {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        if (this.processedPhotoIdsClearInterval !== null) {
            clearInterval(this.processedPhotoIdsClearInterval);
            this.processedPhotoIdsClearInterval = null;
        }
        if (this.connectivityUnsubscribe) {
            this.connectivityUnsubscribe();
            this.connectivityUnsubscribe = null;
        }
        connectivityService.stop();
        logger.info("[SyncService] Auto-polling stopped");
    }

    /**
     * Subscribe to sync state changes. Returns unsubscribe function.
     */
    public subscribe(listener: (state: SyncState) => void): () => void {
        this.stateListeners.push(listener);
        listener(this.syncState);
        return () => {
            this.stateListeners = this.stateListeners.filter(l => l !== listener);
        };
    }

    private setSyncState(partial: Partial<SyncState>) {
        this.syncState = { ...this.syncState, ...partial };
        for (const listener of this.stateListeners) {
            try {
                listener(this.syncState);
            } catch (e) {
                // ignore listener errors
            }
        }
    }

    public getSyncState(): SyncState {
        return { ...this.syncState };
    }

    public async sync() {
        if (!this.masterUrl || this.isSyncing) return;
        this.isSyncing = true;
        this.setSyncState({ isSyncing: true, lastSyncError: null });

        try {
            const kioskId = localStorage.getItem('kioskId') || 'unknown';
            const healthRes = await fetch(`${this.masterUrl}/api/kiosk/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kioskId,
                    ip: 'auto',
                    status: 'Syncing',
                    version: '1.0'
                }),
                signal: AbortSignal.timeout(5000)
            }).catch(() => null);

            if (!healthRes || !healthRes.ok) {
                logger.debug("[SyncService] Master unavailable (Heartbeat failed)", { masterUrl: this.masterUrl });
                this.setSyncState({ isSyncing: false, lastSyncError: 'Master unavailable' });
                return;
            }

            await this.pushOrdersToMaster();
            await this.pullAlbumsFromMaster();

            if (this.failedPhotoQueue.length > 0) {
                await this.retryFailedPhotos();
            }

            this.setSyncState({
                isSyncing: false,
                lastSyncAt: Date.now(),
                lastSyncError: null,
            });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            if (isNetworkError(e)) {
                logger.debug("[SyncService] Sync skipped (Network unavailable)", { masterUrl: this.masterUrl, error: errorMsg });
            } else {
                logger.warn("[SyncService] Sync failed", { error: errorMsg, masterUrl: this.masterUrl });
            }
            this.setSyncState({ isSyncing: false, lastSyncError: errorMsg });
        } finally {
            this.isSyncing = false;
        }
    }

    private async retryFailedPhotos() {
        const photosToRetry = [...this.failedPhotoQueue];

        for (const photo of photosToRetry) {
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

            if (photo.retryCount > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
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
     * Push pending orders from Touch Kiosk to Master Station.
     * Uses clientMutationId for idempotency and persists queue in IndexedDB.
     */
    private async pushOrdersToMaster() {
        // Fetch pending orders from local PocketBase
        let pendingOrders: any[] = [];
        try {
            pendingOrders = await pb.collection('orders').getFullList({
                filter: `status = "Pending"`
            });
        } catch (e) {
            logger.warn("[SyncService] Could not fetch pending orders from local DB", { error: e instanceof Error ? e.message : String(e) });
            return;
        }

        // Also check IndexedDB offline queue for orders that never made it to PB
        try {
            const offlineOrders = await db.orders.where('status').equals('Pending').toArray();
            const pbIds = new Set(pendingOrders.map(o => o.id));
            for (const offlineOrder of offlineOrders) {
                if (!pbIds.has(offlineOrder.id)) {
                    pendingOrders.push(offlineOrder);
                }
            }
        } catch (e) {
            // IndexedDB may be empty or unavailable
        }

        this.setSyncState({ pendingOrdersCount: pendingOrders.length });
        if (pendingOrders.length === 0) return;

        logger.info(`[SyncService] Pushing ${pendingOrders.length} pending orders to Master`);

        for (const order of pendingOrders) {
            try {
                const clientMutationId = order.clientMutationId || `kiosk-${order.id}-${order.created || Date.now()}`;
                const kioskId = localStorage.getItem('kioskId') || 'unknown';

                const res = await fetch(`${this.masterUrl}/api/orders/kiosk/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientMutationId,
                        clientDeviceId: kioskId,
                        items: order.items || [],
                        clientName: order.clientName || '',
                        email: order.email || '',
                        total: order.total || 0,
                        status: order.status || 'Pending',
                        date: order.date || new Date().toISOString().split('T')[0],
                        destinationId: order.destinationId || 'dest1',
                        photographerId: order.photographerId || 0,
                        roomNumber: order.roomNumber || '',
                        appliedDiscount: order.appliedDiscount || 0,
                    }),
                    signal: AbortSignal.timeout(15000)
                });

                if (res.ok || res.status === 208) {
                    // Success or deduplicated
                    const result = await res.json().catch(() => ({}));
                    logger.info(`[SyncService] Order pushed to Master`, { orderId: order.id, masterId: result.id, deduplicated: result.deduplicated });

                    // Mark as synced locally
                    try {
                        await pb.collection('orders').update(order.id, { status: 'Synced' });
                    } catch (pbErr) {
                        logger.warn("[SyncService] Failed to update local order status", { orderId: order.id });
                    }

                    // Remove from IndexedDB offline queue if present
                    try {
                        await db.orders.delete(order.id);
                    } catch (e) {
                        // may not exist in IndexedDB
                    }
                } else {
                    const txt = await res.text();
                    logger.warn(`[SyncService] Master rejected order`, { orderId: order.id, status: res.status, error: txt });
                }
            } catch (e) {
                logger.error(`[SyncService] Failed to push order`, e instanceof Error ? e : undefined, { orderId: order.id });
            }
        }

        this.setSyncState({ pendingOrdersCount: 0 });
    }

    private async pullAlbumsFromMaster() {
        try {
            const checkpoint = await syncCheckpointService.loadCheckpoint();
            const isResume = checkpoint !== null;

            if (isResume) {
                logger.info("[SyncService] Resuming sync from checkpoint", {
                    albumsProcessed: checkpoint.albumsProcessed.length,
                    photosProcessed: checkpoint.photosProcessed.length
                });
            }

            const res = await fetch(`${this.masterUrl}/api/collections/albums/records?filter=(status='Finalized')&expand=photos_via_album`);
            if (!res.ok) {
                logger.warn("[SyncService] Failed to fetch albums from Master", { status: res.status, statusText: res.statusText });
                return;
            }

            const data = await res.json();
            let masterAlbums = data.items || [];

            if (masterAlbums.length === 0) {
                logger.debug("[SyncService] No finalized albums to sync");
                if (checkpoint) {
                    await syncCheckpointService.clearCheckpoint();
                }
                return;
            }

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

            if (!checkpoint) {
                await syncCheckpointService.saveCheckpoint({
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

            for (let i = 0; i < masterAlbums.length; i += this.BATCH_SIZE) {
                const batch = masterAlbums.slice(i, i + this.BATCH_SIZE);
                await Promise.all(batch.map((album: any) => this.processAlbum(album)));

                if (this.syncProgress) {
                    await syncCheckpointService.updateCheckpoint({
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

            if (this.syncProgress) {
                const duration = Date.now() - this.syncProgress.startTime;
                logger.info("[SyncService] Album sync completed", {
                    albumsProcessed: this.syncProgress.albumsProcessed,
                    photosProcessed: this.syncProgress.photosProcessed,
                    photosTotal: this.syncProgress.photosTotal,
                    bytesTransferred: this.syncProgress.bytesTransferred,
                    durationMs: duration
                });

                await syncCheckpointService.clearCheckpoint();
                this.syncProgress = null;
            }
        } catch (e) {
            logger.error("[SyncService] Failed to pull albums from Master", e instanceof Error ? e : undefined, {});
        }
    }

    private async processAlbum(rAlbum: any): Promise<void> {
        try {
            if (this.realtimeReceivedAlbums.has(rAlbum.id)) {
                logger.debug("[SyncService] Skipping album received via real-time", { albumId: rAlbum.id });
                return;
            }

            const localExists = await pb.collection('albums').getOne(rAlbum.id).catch(() => null);

            if (await syncCheckpointService.isAlbumProcessed(rAlbum.id)) {
                logger.debug("[SyncService] Album already processed (checkpoint)", { albumId: rAlbum.id });
                return;
            }

            if (!localExists) {
                logger.info(`[SyncService] Pulling new album`, { albumId: rAlbum.id, albumTitle: rAlbum.title });

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
                await pb.collection('albums').update(rAlbum.id, { kiosk_ready: 1 });
            }

            await syncCheckpointService.markAlbumProcessed(rAlbum.id);

            const photos = rAlbum.expand?.photos_via_album || [];
            if (photos.length > 0) {
                await this.processPhotosBatch(rAlbum, photos);
            }
        } catch (e) {
            logger.error(`[SyncService] Failed to process album`, e instanceof Error ? e : undefined, { albumId: rAlbum.id });
        }
    }

    private async processPhotosBatch(album: any, photos: any[]): Promise<void> {
        const photosToProcess = photos.filter(photo => {
            if (this.processedPhotoIds.has(photo.id)) {
                logger.debug("[SyncService] Photo already processed in this session", { photoId: photo.id });
                return false;
            }
            return true;
        });

        for (let i = 0; i < photosToProcess.length; i += this.MAX_CONCURRENT_DOWNLOADS) {
            const batch = photosToProcess.slice(i, i + this.MAX_CONCURRENT_DOWNLOADS);
            await Promise.allSettled(
                batch.map(photo => this.processPhoto(album, photo))
            );
        }
    }

    private async processPhoto(album: any, photo: any): Promise<void> {
        if (await syncCheckpointService.isPhotoProcessed(photo.id)) {
            logger.debug("[SyncService] Photo already processed (checkpoint)", { photoId: photo.id });
            this.processedPhotoIds.add(photo.id);
            if (this.syncProgress) {
                this.syncProgress.photosProcessed++;
            }
            return;
        }

        try {
            const localPhotoExists = await pb.collection('photos').getOne(photo.id).catch(() => null);
            if (localPhotoExists) {
                logger.debug(`[SyncService] Photo already exists locally, skipping`, { photoId: photo.id });
                this.processedPhotoIds.add(photo.id);
                await syncCheckpointService.markPhotoProcessed(photo.id);
                if (this.syncProgress) {
                    this.syncProgress.photosProcessed++;
                }
                return;
            }
        } catch (checkError) {
            logger.warn("[SyncService] Error checking if photo exists", { photoId: photo.id });
        }

        let photoPath = photo.url || photo.storagePath || photo.originalFilename || '';
        if (!photoPath || (!photoPath.includes('/') && !photoPath.includes('.'))) {
            photoPath = `${photo.id}.jpg`;
        }

        const urlPatterns = [
            `${this.masterUrl}/api/files/photos/${photo.id}/${encodeURIComponent(photoPath)}`,
            photo.url?.startsWith('http') ? photo.url : null,
        ].filter(Boolean) as string[];

        let success = false;
        let lastError: string | undefined;

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
                    await syncCheckpointService.markPhotoProcessed(photo.id);
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

            let filename = originalFilename || photoPath.split('/').pop() || `${photoId}.jpg`;
            if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg')) {
                filename = `${filename}.jpg`;
            }

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

            if (this.syncProgress) {
                this.syncProgress.bytesTransferred += (result.size || 0);
            }

            return true;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
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
