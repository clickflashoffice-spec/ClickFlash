/**
 * UploadQueueService.ts
 * Production offline-first photo upload queue for wandering studio/resort staff.
 * Features:
 * - Reactive listener subscriptions for UI badge counts
 * - Automatic exponential backoff retry on network failures
 * - Configurable Master/Cloud endpoint
 */

export interface QueuedPhoto {
    id: string;
    uri: string;
    guestId: string;
    timestamp: string;
    attempts?: number;
}

export interface QueueStatus {
    pendingCount: number;
    isUploading: boolean;
    lastError: string | null;
}

type QueueListener = (status: QueueStatus) => void;

class UploadQueueServiceImpl {
    private queue: QueuedPhoto[] = [];
    private isUploading = false;
    private lastError: string | null = null;
    private masterEndpoint = 'http://192.168.1.100:8090/api/mobile-staff/upload';
    private retryTimeoutId: any = null;
    private retryDelayMs = 3000;
    private listeners: Set<QueueListener> = new Set();

    constructor() {
        // Attempt initial queue flush
        this.processQueue();
    }

    setMasterEndpoint(url: string): void {
        this.masterEndpoint = url;
    }

    subscribe(listener: QueueListener): () => void {
        this.listeners.add(listener);
        listener(this.getStatus());
        return () => this.listeners.delete(listener);
    }

    getStatus(): QueueStatus {
        return {
            pendingCount: this.queue.length,
            isUploading: this.isUploading,
            lastError: this.lastError
        };
    }

    private notifyListeners(): void {
        const status = this.getStatus();
        this.listeners.forEach((listener) => listener(status));
    }

    enqueue(photo: Omit<QueuedPhoto, 'id'>): QueuedPhoto {
        const newPhoto: QueuedPhoto = {
            ...photo,
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            attempts: 0
        };
        this.queue.push(newPhoto);
        this.lastError = null;
        this.notifyListeners();
        this.processQueue();
        return newPhoto;
    }

    private async processQueue() {
        if (this.isUploading || this.queue.length === 0) return;

        this.isUploading = true;
        this.notifyListeners();

        while (this.queue.length > 0) {
            const photo = this.queue[0];
            photo.attempts = (photo.attempts || 0) + 1;

            try {
                const formData = new FormData();
                formData.append('guestId', photo.guestId);
                formData.append('timestamp', photo.timestamp);
                formData.append('photoId', photo.id);
                
                const response = await fetch(photo.uri);
                const blob = await response.blob();
                formData.append('photo', blob, `${photo.id}.jpg`);

                const uploadRes = await fetch(this.masterEndpoint, {
                    method: 'POST',
                    body: formData,
                });

                if (uploadRes.ok) {
                    this.queue.shift();
                    this.lastError = null;
                    this.retryDelayMs = 3000; // Reset backoff
                    this.notifyListeners();
                } else {
                    this.lastError = `Server HTTP ${uploadRes.status}`;
                    break;
                }
            } catch (error: any) {
                this.lastError = error?.message || 'Network unreachable';
                break;
            }
        }

        this.isUploading = false;
        this.notifyListeners();

        // If queue still has items, schedule exponential backoff retry
        if (this.queue.length > 0) {
            this.scheduleRetry();
        }
    }

    private scheduleRetry() {
        if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
        this.retryTimeoutId = setTimeout(() => {
            this.processQueue();
        }, this.retryDelayMs);
        // Exponential backoff up to 60 seconds
        this.retryDelayMs = Math.min(this.retryDelayMs * 1.5, 60000);
    }

    retry() {
        if (this.retryTimeoutId) clearTimeout(this.retryTimeoutId);
        this.retryDelayMs = 3000;
        this.processQueue();
    }
}

export const UploadQueueService = new UploadQueueServiceImpl();
