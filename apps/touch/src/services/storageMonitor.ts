/**
 * Storage Monitor Service
 * 
 * Monitors storage quota and usage for IndexedDB and Cache API.
 * Provides warnings when storage is running low.
 * 
 * Features:
 * - Storage quota estimation
 * - Usage tracking by store
 * - Warning thresholds
 * - Automatic cleanup suggestions
 */

import { db } from './db';
import { logger } from '../utils/logger';
import { kioskConfig } from '../config/kioskConfig';

export interface StorageStats {
    quota: number;
    usage: number;
    available: number;
    percentUsed: number;
    breakdown: {
        indexedDB: number;
        cache: number;
        other: number;
    };
}

export interface StoreUsage {
    name: string;
    count: number;
    estimatedSize: number;
}

class StorageMonitorService {
    private warningThreshold = kioskConfig.offline.storageQuotaWarningPercent; // 80%
    private criticalThreshold = 95;
    private checkInterval: number | null = null;
    private lastStats: StorageStats | null = null;

    /**
     * Get current storage statistics
     */
    async getStats(): Promise<StorageStats> {
        try {
            // Get quota estimate
            const estimate = await navigator.storage.estimate();
            
            const quota = estimate.quota || 0;
            const usage = estimate.usage || 0;
            const available = quota - usage;
            const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

            // Breakdown by storage type
            const breakdown = {
                indexedDB: 0,
                cache: 0,
                other: 0
            };

            if ((estimate as any).usageDetails) {
                breakdown.indexedDB = (estimate as any).usageDetails.indexedDB || 0;
                breakdown.cache = (estimate as any).usageDetails.caches || 0;
                breakdown.other = usage - breakdown.indexedDB - breakdown.cache;
            } else {
                breakdown.other = usage;
            }

            const stats: StorageStats = {
                quota,
                usage,
                available,
                percentUsed,
                breakdown
            };

            this.lastStats = stats;
            return stats;
        } catch (error) {
            logger.error('[StorageMonitor] Failed to get stats', error as Error);
            return {
                quota: 0,
                usage: 0,
                available: 0,
                percentUsed: 0,
                breakdown: { indexedDB: 0, cache: 0, other: 0 }
            };
        }
    }

    /**
     * Get detailed usage by IndexedDB store
     */
    async getStoreUsage(): Promise<StoreUsage[]> {
        const stores: StoreUsage[] = [];

        try {
            // Check each table
            for (const table of db.tables) {
                const count = await table.count();
                // Estimate size (rough approximation)
                const estimatedSize = count * 1024; // Assume 1KB per record average
                
                stores.push({
                    name: table.name,
                    count,
                    estimatedSize
                });
            }
        } catch (error) {
            logger.error('[StorageMonitor] Failed to get store usage', error as Error);
        }

        return stores;
    }

    /**
     * Check if storage is healthy
     * Returns true if usage is below warning threshold
     */
    async isHealthy(): Promise<boolean> {
        const stats = await this.getStats();
        return stats.percentUsed < this.warningThreshold;
    }

    /**
     * Get storage status message
     */
    async getStatus(): Promise<{ level: 'ok' | 'warning' | 'critical'; message: string }> {
        const stats = await this.getStats();

        if (stats.percentUsed >= this.criticalThreshold) {
            return {
                level: 'critical',
                message: `Storage critically low: ${stats.percentUsed.toFixed(1)}% used`
            };
        } else if (stats.percentUsed >= this.warningThreshold) {
            return {
                level: 'warning',
                message: `Storage running low: ${stats.percentUsed.toFixed(1)}% used`
            };
        } else {
            return {
                level: 'ok',
                message: `Storage healthy: ${stats.percentUsed.toFixed(1)}% used`
            };
        }
    }

    /**
     * Start periodic monitoring
     */
    startMonitoring(intervalMs: number = 60000): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = window.setInterval(async () => {
            const stats = await this.getStats();
            
            if (stats.percentUsed >= this.criticalThreshold) {
                logger.error('[StorageMonitor] CRITICAL: Storage nearly full', {
                    percentUsed: stats.percentUsed,
                    available: this.formatBytes(stats.available)
                });
                
                // Trigger cleanup
                await this.suggestCleanup();
                
            } else if (stats.percentUsed >= this.warningThreshold) {
                logger.warn('[StorageMonitor] WARNING: Storage running low', {
                    percentUsed: stats.percentUsed,
                    available: this.formatBytes(stats.available)
                });
            }
        }, intervalMs);

        logger.info('[StorageMonitor] Started monitoring', { intervalMs });
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Suggest and perform cleanup
     */
    async suggestCleanup(): Promise<void> {
        try {
            const stores = await this.getStoreUsage();
            
            // Sort by size (descending)
            stores.sort((a, b) => b.estimatedSize - a.estimatedSize);
            
            logger.info('[StorageMonitor] Cleanup suggestions:', stores.map(s => ({
                name: s.name,
                count: s.count,
                size: this.formatBytes(s.estimatedSize)
            })));

            // Auto-cleanup old offline queue items
            const queueTable = db.table('offlineQueue');
            if (queueTable) {
                const deadItems = await queueTable
                    .where('status')
                    .equals('dead')
                    .toArray();
                
                if (deadItems.length > 0) {
                    await queueTable.bulkDelete(deadItems.map(i => i.id));
                    logger.info(`[StorageMonitor] Cleaned up ${deadItems.length} dead queue items`);
                }
            }

            // Clean up old orders (keep last 30 days)
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const ordersTable = db.table('orders');
            if (ordersTable) {
                const oldOrders = await ordersTable
                    .where('timestamp')
                    .below(thirtyDaysAgo)
                    .toArray();
                
                if (oldOrders.length > 0) {
                    await ordersTable.bulkDelete(oldOrders.map((o: any) => o.id));
                    logger.info(`[StorageMonitor] Cleaned up ${oldOrders.length} old orders`);
                }
            }

        } catch (error) {
            logger.error('[StorageMonitor] Cleanup failed', error as Error);
        }
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get formatted storage report
     */
    async getReport(): Promise<string> {
        const stats = await this.getStats();
        const stores = await this.getStoreUsage();
        
        let report = '=== Storage Report ===\n';
        report += `Total: ${this.formatBytes(stats.quota)}\n`;
        report += `Used: ${this.formatBytes(stats.usage)} (${stats.percentUsed.toFixed(1)}%)\n`;
        report += `Available: ${this.formatBytes(stats.available)}\n`;
        report += '\nBreakdown:\n';
        report += `  IndexedDB: ${this.formatBytes(stats.breakdown.indexedDB)}\n`;
        report += `  Cache: ${this.formatBytes(stats.breakdown.cache)}\n`;
        report += `  Other: ${this.formatBytes(stats.breakdown.other)}\n`;
        report += '\nStore Details:\n';
        
        for (const store of stores) {
            report += `  ${store.name}: ${store.count} items (~${this.formatBytes(store.estimatedSize)})\n`;
        }
        
        return report;
    }
}

export const storageMonitor = new StorageMonitorService();
