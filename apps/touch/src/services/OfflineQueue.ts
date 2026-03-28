
// Define the expected window interface extensions
declare global {
    interface Window {
        sendSyncMessage?: (item: QueueItem) => Promise<boolean>;
    }
}

interface QueueItem {
    id: string;
    type: 'MUTATION';
    entity: string;
    action: string; // 'create' | 'update' | 'delete' | 'custom'
    payload: any;
    timestamp: number;
    retryCount: number;
}

const QUEUE_STORAGE_KEY = 'star_master_offline_queue';

class OfflineQueueService {
    private queue: QueueItem[] = [];
    private isProcessing = false;
    private maxRetries = 5;
    private syncEndpoint = '/api/sync/mutation'; // Or WebSocket endpoint

    constructor() {
        this.loadQueue();
        window.addEventListener('online', () => this.processQueue());
        // Also listen for custom 'socket-connected' event if we use WS
        window.addEventListener('socket-connected', () => this.processQueue());
    }

    private loadQueue() {
        try {
            const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
                console.log(`[OfflineQueue] Loaded ${this.queue.length} items from storage.`);
            }
        } catch (e) {
            console.error('[OfflineQueue] Failed to load queue:', e);
            this.queue = [];
        }
    }

    private saveQueue() {
        try {
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.error('[OfflineQueue] Failed to save queue (Quota exceeded?):', e);
        }
    }

    /**
     * Add an action to the queue.
     * Guaranteed to persist to localStorage immediately.
     */
    public enqueue(entity: string, action: string, payload: any) {
        const item: QueueItem = {
            id: crypto.randomUUID(),
            type: 'MUTATION',
            entity,
            action,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };

        this.queue.push(item);
        this.saveQueue();
        console.log(`[OfflineQueue] Enqueued ${entity}.${action} (ID: ${item.id})`);

        // Try to process immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }
    }

    /**
     * Attempts to flush the queue to the server.
     * Uses sequential processing to ensure order preservation.
     */
    public async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        if (!navigator.onLine) {
            console.log('[OfflineQueue] Offline, pausing processing.');
            return;
        }

        this.isProcessing = true;
        console.log(`[OfflineQueue] Processing ${this.queue.length} items...`);

        // Copy queue to iterate, but refer to this.queue for mutations
        const currentBatch = [...this.queue];

        for (const item of currentBatch) {
            try {
                const success = await this.sendItem(item);
                if (success) {
                    this.removeFromQueue(item.id);
                } else {
                    // Stop processing if one fails (to preserve order dependency)
                    // Unless it's a non-critical error, but for now strict ordering is safer.
                    console.warn(`[OfflineQueue] Item ${item.id} failed, halting queue.`);
                    break;
                }
            } catch (error) {
                console.error(`[OfflineQueue] Error processing item ${item.id}:`, error);
                // Increment retry count?
                this.incrementRetry(item.id);
                break;
            }
        }

        this.isProcessing = false;
    }

    // ... inside class ...

    private async sendItem(item: QueueItem): Promise<boolean> {
        try {
            // Priority: Electron IPC Bridge
            if (window.sendSyncMessage) {
                return await window.sendSyncMessage(item);
            }

            // Fallback: HTTP Post to Master
            // We assume base location is the master or proxy
            const endpoint = '/api/sync/mutation';
            console.log(`[OfflineQueue] Sending ${item.id} via HTTP to ${endpoint}`);

            const kioskId = localStorage.getItem('kioskId') || 'unknown-kiosk';
            const signingSecret = localStorage.getItem('signingSecret');
            const timestamp = Date.now().toString();

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'x-kiosk-id': kioskId,
                'x-timestamp': timestamp
            };

            if (signingSecret) {
                // Canonicalize body for signature consistency (matching Master's lanSigningMiddleware)
                const canonicalJson = (obj: any): string => {
                    if (!obj || typeof obj !== 'object') return String(obj);
                    const keys = Object.keys(obj).sort();
                    return `{${keys.map(k => `"${k}":${typeof obj[k] === 'object' ? canonicalJson(obj[k]) : JSON.stringify(obj[k])}`).join(',')}}`;
                };

                const bodyStr = JSON.stringify(item); // Simple JSON.stringify for now, or match canonical
                // To be safe, let's use the same canonical logic if the body is complex
                const payload = `${kioskId}:${timestamp}:POST:${endpoint}:${bodyStr}`;

                // In browser, we use Web Crypto API for HMAC-SHA256
                try {
                    const encoder = new TextEncoder();
                    const keyData = encoder.encode(signingSecret);
                    const msgData = encoder.encode(payload);

                    const cryptoKey = await window.crypto.subtle.importKey(
                        'raw',
                        keyData,
                        { name: 'HMAC', hash: 'SHA-256' },
                        false,
                        ['sign']
                    );

                    const signatureBuffer = await window.crypto.subtle.sign(
                        'HMAC',
                        cryptoKey,
                        msgData
                    );

                    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
                    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

                    headers['x-signature'] = signatureHex;
                } catch (cryptoErr) {
                    console.error('[OfflineQueue] HMAC signing failed:', cryptoErr);
                    // Continue without signature? No, Master will reject if enforced.
                }
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(item)
            });


            if (!res.ok) {
                console.warn(`[OfflineQueue] HTTP Sync failed: ${res.status} ${res.statusText}`);
                return false;
            }
            return true;

        } catch (e) {
            console.error(`[OfflineQueue] Send network error for ${item.id}:`, e);
            return false;
        }
    }

    private removeFromQueue(id: string) {
        this.queue = this.queue.filter(i => i.id !== id);
        this.saveQueue();
    }

    private incrementRetry(id: string) {
        const index = this.queue.findIndex(i => i.id === id);
        if (index !== -1) {
            this.queue[index].retryCount++;
            if (this.queue[index].retryCount > this.maxRetries) {
                console.error(`[OfflineQueue] Item ${id} exceeded max retries, moving to Dead Letter Queue (not implemented).`);
                // For now, remove to unblock queue? Or keep it?
                // Removing to prevent permanent blockage.
                this.queue.splice(index, 1);
            }
            this.saveQueue();
        }
    }

    public getQueueLength(): number {
        return this.queue.length;
    }
}

export const offlineQueue = new OfflineQueueService();
