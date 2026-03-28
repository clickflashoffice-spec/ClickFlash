import { pb, localPB, PocketRecord } from './pb';
import { isCloudMode } from '../utils/appMode';
import { networkManager } from './networkManager';
import { dataVersionManager, CollectionName } from './dataVersionManager';
import { serviceWorkerService } from './serviceWorkerService';
import { logger } from '../utils/logger';
import { PocketRecord as PbTypesRecord } from './pbTypes';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'pending';

class CloudSyncService {
    private static instance: CloudSyncService;
    private isSyncing = false;
    private syncQueue: Set<string> = new Set();
    private lastSyncTime: number = 0;
    private syncMetrics = {
        lastDuration: 0,
        totalItemsSynced: 0,
        errors: 0
    };

    private constructor() {
        if (isCloudMode) {
            // Periodic sync based on network quality
            this.setupAdaptiveSync();
        }
    }

    public static getInstance(): CloudSyncService {
        if (!CloudSyncService.instance) {
            CloudSyncService.instance = new CloudSyncService();
        }
        return CloudSyncService.instance;
    }

    private setupAdaptiveSync() {
        const runSync = async () => {
            const state = networkManager.getState();
            if (state.isOnline && state.quality !== 'poor') {
                await this.performBackgroundSync();
            }

            // Reschedule based on quality
            const nextInterval = this.getSyncInterval(state.quality);
            setTimeout(runSync, nextInterval);
        };

        setTimeout(runSync, 10000); // Initial delay
    }

    private getSyncInterval(quality: string): number {
        switch (quality) {
            case 'excellent': return 15000; // 15s
            case 'good': return 30000;      // 30s
            case 'fair': return 60000;      // 1 min
            case 'poor': return 300000;     // 5 mins
            default: return 60000;
        }
    }

    public async performBackgroundSync(force: boolean = false) {
        if (this.isSyncing && !force) return;
        this.isSyncing = true;

        const startTime = performance.now();
        logger.info(`[SyncService] Starting sync check (force=${force})`);

        try {
            // 1. Replay queued offline requests first
            await this.replayOfflineRequests();

            // 2. Fetch delta updates from cloud
            const syncedCount = await this.syncDeltaUpdates();

            this.lastSyncTime = Date.now();
            this.syncMetrics.lastDuration = Math.round(performance.now() - startTime);
            this.syncMetrics.totalItemsSynced += syncedCount;

            logger.info(`[SyncService] Sync completed in ${this.syncMetrics.lastDuration}ms. Synced ${syncedCount} items.`);
        } catch (error) {
            this.syncMetrics.errors++;
            logger.error('[SyncService] Background sync failed', error);
        } finally {
            this.isSyncing = false;
        }
    }

    public async forceSync() {
        return this.performBackgroundSync(true);
    }

    private async replayOfflineRequests() {
        // Integrate with serviceWorkerService to push queued mutations
        const queuedCount = await serviceWorkerService.syncQueuedRequests();
        if (queuedCount > 0) {
            logger.info(`[SyncService] Replayed ${queuedCount} offline mutations`);
        }
    }

    private async syncDeltaUpdates(): Promise<number> {
        const collectionsToSync: CollectionName[] = ['albums', 'photos', 'orders', 'settings', 'money_trash' as any];
        let totalSynced = 0;

        for (const collection of collectionsToSync) {
            const lastVersion = dataVersionManager.getVersion(collection);

            try {
                // Fetch only items updated since last sync
                const serverItems = await pb.collection(collection).getFullList({
                    filter: `updated > "${new Date(this.lastSyncTime).toISOString()}"`
                });

                if (serverItems.length > 0) {
                    logger.info(`[SyncService] Processing ${serverItems.length} updates for ${collection}`);

                    // Use smaller batches to avoid blocking main thread
                    const BATCH_SIZE = 10;
                    for (let i = 0; i < serverItems.length; i += BATCH_SIZE) {
                        const batch = serverItems.slice(i, i + BATCH_SIZE);
                        await Promise.all(batch.map(item => this.applyUpdate(collection, item)));

                        // Small yield to let UI breathe
                        if (i + BATCH_SIZE < serverItems.length) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }

                    totalSynced += serverItems.length;

                    // Update local version
                    const maxVersion = Math.max(...serverItems.map((i: PbTypesRecord) => ((i as Record<string, unknown>).version as number) || 0));
                    if (maxVersion > lastVersion.version) {
                        dataVersionManager.setVersion(collection, maxVersion);
                    }
                }
            } catch (err) {
                logger.warn(`[SyncService] Failed to sync collection: ${collection}`, err);
            }
        }
        return totalSynced;
    }

    private async applyUpdate(collection: CollectionName, remoteItem: PbTypesRecord) {
        const localItem = await this.getLocalItem(collection, remoteItem.id);

        if (!localItem) {
            // New item from server, just save it locally
            await this.saveLocalItem(collection, remoteItem);
            return;
        }

        // Check for conflicts using dataVersionManager
        const conflict = dataVersionManager.detectConflict(
            collection,
            remoteItem.version || 0,
            remoteItem.updated
        );

        if (conflict) {
            logger.info(`[SyncService] Conflict detected for ${collection}:${remoteItem.id}. Resolving via ${conflict.resolution}`);

            if (conflict.resolution === 'server' || (remoteItem.updated > (localItem.updated || ''))) {
                // Last Write Wins - Server or newer wins
                await this.saveLocalItem(collection, remoteItem);
            } else {
                // Client wins or needs merge (not implemented yet, default to local if newer)
                logger.debug(`[SyncService] Keeping local version for ${collection}:${remoteItem.id}`);
            }
        } else {
            // No conflict, just update if remote is newer
            if (remoteItem.updated > (localItem.updated || '')) {
                await this.saveLocalItem(collection, remoteItem);
            }
        }
    }

    private async getLocalItem(collection: string, id: string): Promise<PbTypesRecord | null> {
        try {
            // Fetch from local backend directly
            return await localPB.collection(collection).getOne(id);
        } catch {
            return null;
        }
    }

    private async saveLocalItem(collection: string, item: PbTypesRecord) {
        try {
            // Upsert into local backend
            // Check if exists first to decide create vs update
            const existing = await this.getLocalItem(collection, item.id);
            if (existing) {
                await localPB.collection(collection).update(item.id, item);
            } else {
                await localPB.collection(collection).create(item);
            }
            logger.debug(`[SyncService] Successfully saved item to local DB: ${collection}:${item.id}`);
        } catch (error) {
            logger.error(`[SyncService] Failed to save item to local DB: ${collection}:${item.id}`, error);
        }
    }

    public async syncRecord(collection: string, id: string) {
        if (!isCloudMode) return;
        this.syncQueue.add(`${collection}:${id}`);
        // Throttle immediate sync for high-priority records could be added here
    }

    public getStatus() {
        return {
            lastSyncTime: this.lastSyncTime,
            isSyncing: this.isSyncing,
            metrics: { ...this.syncMetrics }
        };
    }
}

export const cloudSyncService = CloudSyncService.getInstance();
