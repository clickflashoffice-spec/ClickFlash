import { logger } from '../utils/logger';
import { cloudSyncService } from './cloudSyncService';
import { pb, isCloudMode } from './pb';

export interface QueuedPhotoUpload {
    photoId: string;
    albumId?: string;
    sourceUrlOrBase64: string;
    metadata?: Record<string, unknown>;
    priority?: 'high' | 'normal' | 'low';
    addedAt: number;
    status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'failed';
    error?: string;
    originalSizeBytes?: number;
    compressedSizeBytes?: number;
}

export interface SyncManagerStatus {
    pendingCount: number;
    activeCompressionCount: number;
    activeUploadCount: number;
    completedCount: number;
    failedCount: number;
    totalBytesSaved: number;
    isProcessing: boolean;
    queue: QueuedPhotoUpload[];
}

/**
 * SyncManager
 * 
 * Central orchestration service that maintains an aggressive background compression queue
 * before dispatching photos to R2 or PocketBase cloud collections.
 * Enforces strict concurrency limits (maxConcurrent = 2) to prevent memory spikes on 4-core kiosk hardware.
 */
class SyncManager {
    private static instance: SyncManager;
    private queue: Map<string, QueuedPhotoUpload> = new Map();
    private activeCompressions = 0;
    private activeUploads = 0;
    private readonly MAX_CONCURRENT_COMPRESSIONS = 2; // Strict limit for 4-core hardware
    private readonly MAX_CONCURRENT_UPLOADS = 3;
    private isProcessing = false;
    
    private completedCount = 0;
    private failedCount = 0;
    private totalBytesSaved = 0;
    private listeners: Set<(status: SyncManagerStatus) => void> = new Set();

    private constructor() {
        logger.info('[SyncManager] Initialized with concurrency throttling (MAX_COMPRESSION=2)');
    }

    public static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager();
        }
        return SyncManager.instance;
    }

    /**
     * Subscribe to real-time status updates of the compression/upload queue
     */
    public subscribe(listener: (status: SyncManagerStatus) => void): () => void {
        this.listeners.add(listener);
        listener(this.getStatus());
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        const status = this.getStatus();
        this.listeners.forEach(l => {
            try {
                l(status);
            } catch (err) {
                logger.error('[SyncManager] Listener callback error', err);
            }
        });
    }

    public getStatus(): SyncManagerStatus {
        const items = Array.from(this.queue.values());
        const pendingCount = items.filter(i => i.status === 'pending').length;
        const activeCompressionCount = items.filter(i => i.status === 'compressing').length;
        const activeUploadCount = items.filter(i => i.status === 'uploading').length;

        return {
            pendingCount,
            activeCompressionCount,
            activeUploadCount,
            completedCount: this.completedCount,
            failedCount: this.failedCount,
            totalBytesSaved: this.totalBytesSaved,
            isProcessing: this.isProcessing,
            queue: items
        };
    }

    /**
     * Add a photo to the aggressive background compression & upload queue
     */
    public async queuePhotoUpload(
        photoId: string,
        sourceUrlOrBase64: string,
        options?: {
            albumId?: string;
            metadata?: Record<string, unknown>;
            priority?: 'high' | 'normal' | 'low';
        }
    ): Promise<void> {
        const item: QueuedPhotoUpload = {
            photoId,
            albumId: options?.albumId,
            sourceUrlOrBase64,
            metadata: options?.metadata || {},
            priority: options?.priority || 'normal',
            addedAt: Date.now(),
            status: 'pending'
        };

        this.queue.set(photoId, item);
        logger.info(`[SyncManager] Queued photo upload: ${photoId} (Priority: ${item.priority})`);
        this.notifyListeners();
        this.processQueue();
    }

    /**
     * Process queued photos with strict hardware concurrency controls
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (true) {
                const pendingItems = Array.from(this.queue.values())
                    .filter(i => i.status === 'pending')
                    .sort((a, b) => {
                        const priorityWeight = { high: 3, normal: 2, low: 1 };
                        return (priorityWeight[b.priority || 'normal'] - priorityWeight[a.priority || 'normal']) || (a.addedAt - b.addedAt);
                    });

                if (pendingItems.length === 0 && this.activeCompressions === 0 && this.activeUploads === 0) {
                    break;
                }

                // Launch compressions up to MAX_CONCURRENT_COMPRESSIONS and uploads up to MAX_CONCURRENT_UPLOADS
                while (this.activeCompressions < this.MAX_CONCURRENT_COMPRESSIONS && this.activeUploads < this.MAX_CONCURRENT_UPLOADS && pendingItems.length > 0) {
                    const item = pendingItems.shift()!;
                    this.compressAndUploadItem(item);
                }

                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } finally {
            this.isProcessing = false;
            this.notifyListeners();
        }
    }

    private async compressAndUploadItem(item: QueuedPhotoUpload): Promise<void> {
        item.status = 'compressing';
        this.activeCompressions++;
        this.notifyListeners();

        try {
            const startTime = performance.now();
            const { compressedBlob, originalSize, compressedSize } = await this.compressPhoto(item.sourceUrlOrBase64);
            
            item.originalSizeBytes = originalSize;
            item.compressedSizeBytes = compressedSize;
            this.totalBytesSaved += Math.max(0, originalSize - compressedSize);
            
            logger.info(`[SyncManager] Compressed photo ${item.photoId} in ${Math.round(performance.now() - startTime)}ms (${Math.round(originalSize / 1024)}KB -> ${Math.round(compressedSize / 1024)}KB)`);

            this.activeCompressions--;
            item.status = 'uploading';
            this.activeUploads++;
            this.notifyListeners();

            // Perform upload or dispatch to cloud
            await this.dispatchToStorage(item, compressedBlob);

            item.status = 'completed';
            this.completedCount++;
            this.queue.delete(item.photoId);
            logger.info(`[SyncManager] Successfully uploaded photo ${item.photoId} to cloud storage.`);
        } catch (error: any) {
            this.activeCompressions = Math.max(0, this.activeCompressions - (item.status === 'compressing' ? 1 : 0));
            this.activeUploads = Math.max(0, this.activeUploads - (item.status === 'uploading' ? 1 : 0));
            
            item.status = 'failed';
            item.error = error?.message || 'Compression or upload failed';
            this.failedCount++;
            logger.error(`[SyncManager] Failed processing photo ${item.photoId}:`, error);
        } finally {
            this.notifyListeners();
            // Trigger next items
            setTimeout(() => this.processQueue(), 50);
        }
    }

    /**
     * Compress photo using Canvas API to downscale to max 2048px and quality 0.82
     * Prevents high memory consumption on 4-core hardware.
     */
    private async compressPhoto(source: string): Promise<{ compressedBlob: Blob; originalSize: number; compressedSize: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const originalSize = source.startsWith('data:') ? Math.round(source.length * 0.75) : (img.width * img.height * 3);
                    const MAX_DIMENSION = 2048;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = Math.round((height * MAX_DIMENSION) / width);
                            width = MAX_DIMENSION;
                        } else {
                            width = Math.round((width * MAX_DIMENSION) / height);
                            height = MAX_DIMENSION;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        throw new Error('Canvas 2d context unavailable');
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas toBlob failed'));
                                return;
                            }
                            resolve({
                                compressedBlob: blob,
                                originalSize,
                                compressedSize: blob.size
                            });
                        },
                        'image/jpeg',
                        0.82 // High visual fidelity, aggressive size reduction
                    );
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image source for compression'));
            img.src = source;
        });
    }

    private async dispatchToStorage(item: QueuedPhotoUpload, compressedBlob: Blob): Promise<void> {
        if (!isCloudMode) {
            // In local/demo mode, verify local storage or notify cloudSyncService
            await cloudSyncService.syncRecord('photos', item.photoId);
            return;
        }

        const formData = new FormData();
        formData.append('file', compressedBlob, `${item.photoId}.jpg`);
        if (item.albumId) formData.append('album', item.albumId);
        formData.append('updated', new Date().toISOString());

        // Upload to PocketBase or Cloudflare R2 proxy
        await pb.collection('photos').update(item.photoId, formData as any).catch(async () => {
            // If update fails because record doesn't exist yet, create it
            formData.append('id', item.photoId);
            await pb.collection('photos').create(formData as any);
        });
    }

    public clearCompleted(): void {
        Array.from(this.queue.entries()).forEach(([id, item]) => {
            if (item.status === 'completed' || item.status === 'failed') {
                this.queue.delete(id);
            }
        });
        this.notifyListeners();
    }
}

export const syncManager = SyncManager.getInstance();
