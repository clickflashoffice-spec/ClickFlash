/**
 * Unified Offline Queue Service
 *
 * Combines the durability of OfflineQueueV2 (IndexedDB/Dexie storage,
 * retry/dead-letter handling, event-driven processing) with the secure,
 * HMAC-signed HTTP transport of OfflineQueueV1.
 */

declare global {
    interface Window {
        sendSyncMessage?: (item: QueueItem) => Promise<boolean>;
    }
}

import { db } from './db';
import { logger } from '../utils/logger';

export type QueueItemStatus = 'pending' | 'processing' | 'failed' | 'dead';

export interface QueueItem {
    id: string;
    type: 'MUTATION';
    entity: string;
    action: string;
    payload: unknown;
    timestamp: number;
    retryCount: number;
    status: QueueItemStatus;
    error?: string;
    priority?: number;
}

export interface QueueStats {
    total: number;
    pending: number;
    processing: number;
    failed: number;
    dead: number;
}

export type QueueEvent =
    | 'queue:added'
    | 'queue:success'
    | 'queue:failed'
    | 'queue:dead'
    | 'queue:cleared'
    | 'queue:processing:start'
    | 'queue:processing:complete';

const QUEUE_TABLE = 'offlineQueue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 5;
const RETRY_BACKOFF_BASE_MS = 1000;
const SYNC_ENDPOINT = '/api/sync/mutation';
const REQUEST_TIMEOUT_MS = 30000;

class OfflineQueueService {
    private isProcessing = false;
    private eventTarget = new EventTarget();
    private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor() {
        this.init();
    }

    private init() {
        window.addEventListener('online', () => {
            logger.info('[OfflineQueue] Online detected, processing queue');
            this.processQueue();
        });

        window.addEventListener('socket-connected', () => {
            logger.info('[OfflineQueue] Socket connected, processing queue');
            this.processQueue();
        });

        this.getStats().then(stats => {
            if (stats.total > 0) {
                logger.info('[OfflineQueue] Initialized with existing items', stats);
            }
        });
    }

    /**
     * Add a mutation to the queue.
     * Automatically drops the oldest non-processing item if the queue is full.
     */
    public async enqueue(
        entity: string,
        action: string,
        payload: unknown,
        priority = 0
    ): Promise<QueueItem | null> {
        try {
            const stats = await this.getStats();
            if (stats.total >= MAX_QUEUE_SIZE) {
                logger.warn('[OfflineQueue] Queue full, removing oldest item');
                await this.removeOldest();
            }

            const item: QueueItem = {
                id: crypto.randomUUID(),
                type: 'MUTATION',
                entity,
                action,
                payload,
                timestamp: Date.now(),
                retryCount: 0,
                status: 'pending',
                priority
            };

            await db.table<QueueItem>(QUEUE_TABLE).add(item);
            logger.info(`[OfflineQueue] Enqueued ${entity}.${action} (ID: ${item.id})`);

            this.eventTarget.dispatchEvent(new CustomEvent('queue:added', { detail: item }));

            if (navigator.onLine) {
                this.processQueue();
            }

            return item;
        } catch (error) {
            logger.error('[OfflineQueue] Failed to enqueue item', error as Error);
            return null;
        }
    }

    /**
     * Process all pending queue items sequentially.
     * Halts on the first failure to preserve ordering.
     */
    public async processQueue(): Promise<void> {
        if (this.isProcessing || !navigator.onLine) {
            return;
        }

        this.isProcessing = true;
        this.eventTarget.dispatchEvent(new Event('queue:processing:start'));

        try {
            const pending = await db
                .table<QueueItem>(QUEUE_TABLE)
                .where('status')
                .equals('pending')
                .sortBy('timestamp');

            pending.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            if (pending.length === 0) {
                return;
            }

            logger.info(`[OfflineQueue] Processing ${pending.length} items`);

            for (const item of pending) {
                await this.updateItem(item.id, { status: 'processing' });

                try {
                    const success = await this.sendItem(item);
                    if (success) {
                        await this.cancelRetry(item.id);
                        await db.table<QueueItem>(QUEUE_TABLE).delete(item.id);
                        logger.debug(`[OfflineQueue] Item ${item.id} processed successfully`);
                        this.eventTarget.dispatchEvent(new CustomEvent('queue:success', { detail: item }));
                    } else {
                        await this.handleFailure(item, 'Server rejected request');
                        break;
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    await this.handleFailure(item, message);
                    break;
                }
            }
        } catch (error) {
            logger.error('[OfflineQueue] Error processing queue', error as Error);
        } finally {
            this.isProcessing = false;
            this.eventTarget.dispatchEvent(new Event('queue:processing:complete'));
        }
    }

    /**
     * Reset all failed items to pending and trigger processing.
     */
    public async retryFailed(): Promise<void> {
        try {
            const failed = await db
                .table<QueueItem>(QUEUE_TABLE)
                .where('status')
                .equals('failed')
                .toArray();

            for (const item of failed) {
                await this.cancelRetry(item.id);
                await this.updateItem(item.id, { status: 'pending', error: undefined });
            }

            logger.info(`[OfflineQueue] Reset ${failed.length} failed items to pending`);
            this.processQueue();
        } catch (error) {
            logger.error('[OfflineQueue] Failed to retry items', error as Error);
        }
    }

    /**
     * Get queue statistics by status.
     */
    public async getStats(): Promise<QueueStats> {
        try {
            const all = await db.table<QueueItem>(QUEUE_TABLE).toArray();
            return {
                total: all.length,
                pending: all.filter(i => i.status === 'pending').length,
                processing: all.filter(i => i.status === 'processing').length,
                failed: all.filter(i => i.status === 'failed').length,
                dead: all.filter(i => i.status === 'dead').length
            };
        } catch (error) {
            logger.error('[OfflineQueue] Failed to get stats', error as Error);
            return { total: 0, pending: 0, processing: 0, failed: 0, dead: 0 };
        }
    }

    /**
     * Backwards-compatible helper returning the total queue size.
     */
    public async getQueueLength(): Promise<number> {
        const stats = await this.getStats();
        return stats.total;
    }

    /**
     * Get all queued items (useful for debugging).
     */
    public async getAllItems(): Promise<QueueItem[]> {
        return db.table<QueueItem>(QUEUE_TABLE).toArray();
    }

    /**
     * Clear every item from the queue.
     */
    public async clear(): Promise<void> {
        for (const timer of this.retryTimers.values()) {
            clearTimeout(timer);
        }
        this.retryTimers.clear();

        await db.table<QueueItem>(QUEUE_TABLE).clear();
        logger.info('[OfflineQueue] Queue cleared');
        this.eventTarget.dispatchEvent(new Event('queue:cleared'));
    }

    /**
     * Subscribe to queue events.
     */
    public on(event: QueueEvent, callback: (event: Event) => void): void {
        this.eventTarget.addEventListener(event, callback);
    }

    /**
     * Unsubscribe from queue events.
     */
    public off(event: QueueEvent, callback: (event: Event) => void): void {
        this.eventTarget.removeEventListener(event, callback);
    }

    private async removeOldest(): Promise<void> {
        try {
            const oldest = await db
                .table<QueueItem>(QUEUE_TABLE)
                .where('status')
                .notEqual('processing')
                .sortBy('timestamp');

            if (oldest.length > 0) {
                await db.table<QueueItem>(QUEUE_TABLE).delete(oldest[0].id);
                logger.warn('[OfflineQueue] Removed oldest item', { id: oldest[0].id });
            }
        } catch (error) {
            logger.error('[OfflineQueue] Failed to remove oldest item', error as Error);
        }
    }

    private async handleFailure(item: QueueItem, error: string): Promise<void> {
        const newRetryCount = item.retryCount + 1;
        await this.cancelRetry(item.id);

        if (newRetryCount >= MAX_RETRIES) {
            await this.updateItem(item.id, {
                status: 'dead',
                retryCount: newRetryCount,
                error
            });
            logger.error(`[OfflineQueue] Item ${item.id} exceeded max retries, moved to dead queue`);
            this.eventTarget.dispatchEvent(new CustomEvent('queue:dead', { detail: { item, error } }));
            return;
        }

        await this.updateItem(item.id, {
            status: 'failed',
            retryCount: newRetryCount,
            error
        });
        logger.warn(`[OfflineQueue] Item ${item.id} failed (retry ${newRetryCount}/${MAX_RETRIES})`);
        this.eventTarget.dispatchEvent(new CustomEvent('queue:failed', { detail: { item, error } }));

        const backoffMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, newRetryCount - 1);
        const timer = setTimeout(() => {
            this.retryTimers.delete(item.id);
            this.updateItem(item.id, { status: 'pending', error: undefined })
                .then(() => {
                    if (navigator.onLine) {
                        this.processQueue();
                    }
                })
                .catch(retryError => {
                    logger.error('[OfflineQueue] Scheduled retry failed', retryError as Error);
                });
        }, backoffMs);

        this.retryTimers.set(item.id, timer);
    }

    private async cancelRetry(id: string): Promise<void> {
        const timer = this.retryTimers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(id);
        }
    }

    private async updateItem(id: string, changes: Partial<QueueItem>): Promise<void> {
        await db.table<QueueItem>(QUEUE_TABLE).update(id, changes);
    }

    private async sendItem(item: QueueItem): Promise<boolean> {
        if (window.sendSyncMessage) {
            return Boolean(await window.sendSyncMessage(item));
        }

        const kioskId = localStorage.getItem('kioskId') || 'unknown-kiosk';
        const signingSecret = localStorage.getItem('signingSecret');
        const timestamp = Date.now().toString();
        const body = JSON.stringify(item);

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-kiosk-id': kioskId,
            'x-timestamp': timestamp
        };

        if (signingSecret) {
            try {
                headers['x-signature'] = await this.signPayload(kioskId, timestamp, SYNC_ENDPOINT, body, signingSecret);
            } catch (cryptoErr) {
                logger.error('[OfflineQueue] HMAC signing failed', cryptoErr as Error);
            }
        }

        try {
            const res = await fetch(SYNC_ENDPOINT, {
                method: 'POST',
                headers,
                body,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
            });

            if (!res.ok) {
                logger.warn(`[OfflineQueue] HTTP Sync failed: ${res.status} ${res.statusText}`);
                return false;
            }
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[OfflineQueue] Send failed for ${item.id}`, { error: message });
            throw error;
        }
    }

    private async signPayload(
        kioskId: string,
        timestamp: string,
        endpoint: string,
        body: string,
        secret: string
    ): Promise<string> {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const message = `${kioskId}:${timestamp}:POST:${endpoint}:${body}`;
        const msgData = encoder.encode(message);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

export const offlineQueue = new OfflineQueueService();
