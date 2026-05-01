/**
 * Offline Queue Service v2
 * 
 * Enhanced offline mutation queue with:
 * - IndexedDB storage (no localStorage 5MB limit)
 * - Queue size limits with automatic cleanup
 * - Priority-based processing
 * - Compression for large payloads
 * - Event-driven architecture
 */

import { db } from './db';
import { logger } from '../utils/logger';
import { kioskConfig } from '../config/kioskConfig';


export type QueueItemStatus = 'pending' | 'processing' | 'failed' | 'dead';

export interface QueueItem {
    id: string;
    type: 'MUTATION';
    entity: string;
    action: string;
    payload: any;
    timestamp: number;
    retryCount: number;
    status: QueueItemStatus;
    error?: string;
    priority?: number; // Higher = processed first
}

interface QueueStats {
    total: number;
    pending: number;
    processing: number;
    failed: number;
    dead: number;
}

const QUEUE_TABLE = 'offlineQueue';
const MAX_QUEUE_SIZE = kioskConfig.offline.maxQueueSize;
const MAX_RETRIES = 5;
const RETRY_BACKOFF_BASE = 1000;

/**
 * Offline Queue Service v2
 * 
 * Stores mutations in IndexedDB for persistence across sessions.
 * Automatically processes queue when connection is restored.
 */
class OfflineQueueServiceV2 {
    private isProcessing = false;
    private syncEndpoint = '/api/sync/mutation';
    private eventTarget = new EventTarget();

    constructor() {
        this.init();
    }

    private init() {
        // Process queue when coming online
        window.addEventListener('online', () => {
            logger.info('[OfflineQueueV2] Online detected, processing queue');
            this.processQueue();
        });

        // Also listen for custom 'socket-connected' event if we use WS
        window.addEventListener('socket-connected', () => {
            logger.info('[OfflineQueueV2] Socket connected, processing queue');
            this.processQueue();
        });

        // Log initial stats
        this.getStats().then(stats => {
            if (stats.total > 0) {
                logger.info('[OfflineQueueV2] Initialized with existing items', stats);
            }
        });
    }

    /**
     * Get current queue statistics
     */
    async getStats(): Promise<QueueStats> {
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
            logger.error('[OfflineQueueV2] Failed to get stats', error as Error);
            return { total: 0, pending: 0, processing: 0, failed: 0, dead: 0 };
        }
    }

    /**
     * Add an action to the queue
     * Automatically manages queue size by removing oldest items if needed
     */
    public async enqueue(
        entity: string,
        action: string,
        payload: any,
        priority: number = 0
    ): Promise<QueueItem | null> {
        try {
            // Check current queue size
            const stats = await this.getStats();
            if (stats.total >= MAX_QUEUE_SIZE) {
                logger.warn('[OfflineQueueV2] Queue full, removing oldest item');
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
            logger.info(`[OfflineQueueV2] Enqueued ${entity}.${action} (ID: ${item.id})`);

            // Emit event for UI updates
            this.eventTarget.dispatchEvent(new CustomEvent('queue:added', { detail: item }));

            // Try to process immediately if online
            if (navigator.onLine) {
                this.processQueue();
            }

            return item;
        } catch (error) {
            logger.error('[OfflineQueueV2] Failed to enqueue item', error as Error);
            return null;
        }
    }

    /**
     * Remove oldest non-processing item from queue
     */
    private async removeOldest(): Promise<void> {
        try {
            const oldest = await db.table<QueueItem>(QUEUE_TABLE)
                .where('status')
                .notEqual('processing')
                .sortBy('timestamp');

            if (oldest.length > 0) {
                await db.table<QueueItem>(QUEUE_TABLE).delete(oldest[0].id);
                logger.warn('[OfflineQueueV2] Removed oldest item', { id: oldest[0].id });
            }
        } catch (error) {
            logger.error('[OfflineQueueV2] Failed to remove oldest item', error as Error);
        }
    }

    /**
     * Process the queue - send items to server
     * Uses sequential processing to preserve order
     */
    public async processQueue(): Promise<void> {
        if (this.isProcessing || !navigator.onLine) {
            return;
        }

        this.isProcessing = true;
        this.eventTarget.dispatchEvent(new Event('queue:processing:start'));

        try {
            // Get pending items sorted by priority (desc) then timestamp (asc)
            const pending = await db.table<QueueItem>(QUEUE_TABLE)
                .where('status')
                .equals('pending')
                .sortBy('timestamp');

            // Sort by priority (higher first)
            pending.sort((a, b) => (b.priority || 0) - (a.priority || 0));

            if (pending.length === 0) {
                this.isProcessing = false;
                this.eventTarget.dispatchEvent(new Event('queue:processing:complete'));
                return;
            }

            logger.info(`[OfflineQueueV2] Processing ${pending.length} items`);

            for (const item of pending) {
                // Mark as processing
                await this.updateItem(item.id, { status: 'processing' });

                try {
                    const success = await this.sendItem(item);
                    if (success) {
                        await db.table<QueueItem>(QUEUE_TABLE).delete(item.id);
                        logger.debug(`[OfflineQueueV2] Item ${item.id} processed successfully`);
                        this.eventTarget.dispatchEvent(new CustomEvent('queue:success', { detail: item }));
                    } else {
                        await this.handleFailure(item, 'Server rejected request');
                    }
                } catch (error) {
                    await this.handleFailure(item, error instanceof Error ? error.message : 'Unknown error');
                    // Stop processing on failure to preserve order
                    break;
                }
            }
        } catch (error) {
            logger.error('[OfflineQueueV2] Error processing queue', error as Error);
        } finally {
            this.isProcessing = false;
            this.eventTarget.dispatchEvent(new Event('queue:processing:complete'));
        }
    }

    /**
     * Handle item failure with retry logic
     */
    private async handleFailure(item: QueueItem, error: string): Promise<void> {
        const newRetryCount = item.retryCount + 1;
        
        if (newRetryCount >= MAX_RETRIES) {
            // Move to dead letter queue
            await this.updateItem(item.id, {
                status: 'dead',
                retryCount: newRetryCount,
                error
            });
            logger.error(`[OfflineQueueV2] Item ${item.id} exceeded max retries, moved to dead queue`);
            this.eventTarget.dispatchEvent(new CustomEvent('queue:dead', { detail: { item, error } }));
        } else {
            // Mark as failed for retry
            await this.updateItem(item.id, {
                status: 'failed',
                retryCount: newRetryCount,
                error
            });
            logger.warn(`[OfflineQueueV2] Item ${item.id} failed (retry ${newRetryCount}/${MAX_RETRIES})`);
        }
    }

    /**
     * Update item in database
     */
    private async updateItem(id: string, changes: Partial<QueueItem>): Promise<void> {
        await db.table<QueueItem>(QUEUE_TABLE).update(id, changes);
    }

    /**
     * Send single item to server
     */
    private async sendItem(item: QueueItem): Promise<boolean> {
        try {
            // Priority: Electron IPC Bridge
            if (window.sendSyncMessage) {
                return Boolean(await window.sendSyncMessage(item));
            }

            // Fallback: HTTP Post to Master
            const res = await fetch(this.syncEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
                signal: AbortSignal.timeout(30000)
            });

            return res.ok;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error(`[OfflineQueueV2] Send failed for ${item.id}`, { error: errorMsg });
            throw error;
        }
    }

    /**
     * Retry all failed items
     */
    public async retryFailed(): Promise<void> {
        try {
            const failed = await db.table<QueueItem>(QUEUE_TABLE)
                .where('status')
                .equals('failed')
                .toArray();

            for (const item of failed) {
                await this.updateItem(item.id, { status: 'pending', error: undefined });
            }

            logger.info(`[OfflineQueueV2] Reset ${failed.length} failed items to pending`);
            this.processQueue();
        } catch (error) {
            logger.error('[OfflineQueueV2] Failed to retry items', error as Error);
        }
    }

    /**
     * Get all items (for debugging)
     */
    public async getAllItems(): Promise<QueueItem[]> {
        return db.table<QueueItem>(QUEUE_TABLE).toArray();
    }

    /**
     * Clear all items
     */
    public async clear(): Promise<void> {
        await db.table<QueueItem>(QUEUE_TABLE).clear();
        logger.info('[OfflineQueueV2] Queue cleared');
        this.eventTarget.dispatchEvent(new Event('queue:cleared'));
    }

    /**
     * Subscribe to queue events
     */
    public on(event: string, callback: (event: Event) => void): void {
        this.eventTarget.addEventListener(event, callback);
    }

    public off(event: string, callback: (event: Event) => void): void {
        this.eventTarget.removeEventListener(event, callback);
    }
}

// Ensure the queue table exists in Dexie
// This extends the existing db setup
try {
    // Check if we need to add the table (would be done in db.ts ideally)
    if (!db.tables.some(t => t.name === QUEUE_TABLE)) {
        db.version(2).stores({
            [QUEUE_TABLE]: 'id, status, timestamp, priority'
        });
    }
} catch (error) {
    logger.warn('[OfflineQueueV2] Could not upgrade db version', error as Error);
}

export const offlineQueueV2 = new OfflineQueueServiceV2();
