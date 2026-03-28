import { db } from './db';
import { Album, Order } from '../types';
import { logger } from '../utils/logger';

export const offlineStorage = {
    async saveAlbums(albums: Album[]) {
        try {
            // Bulk put is faster
            await db.albums.bulkPut(albums);
            logger.debug('[OfflineStorage] Saved albums to cache', { count: albums.length });
        } catch (error) {
            logger.error('[OfflineStorage] Failed to save albums', error);
        }
    },

    async getAlbums(): Promise<Album[]> {
        try {
            // Sort by date desc (default)
            return await db.albums.orderBy('date').reverse().toArray();
        } catch (error) {
            logger.error('[OfflineStorage] Failed to load albums', error);
            return [];
        }
    },

    async saveOrder(order: Order) {
        try {
            await db.orders.put(order);
        } catch (error) {
            logger.error('[OfflineStorage] Failed to save order', error);
        }
    },

    async getOfflineOrders(): Promise<Order[]> {
        try {
            // Return only pending orders? Or all? 
            // Typically we want unsynced orders. Assuming 'status' helps or we just return all.
            return await db.orders.toArray();
        } catch (error) {
            logger.error('[OfflineStorage] Failed to load offline orders', error);
            return [];
        }
    },

    async clearOfflineOrders(syncedIds: string[]) {
        try {
            await db.orders.bulkDelete(syncedIds);
        } catch (error) {
            logger.error('[OfflineStorage] Failed to clear offline orders', error);
        }
    },

    async clearAll() {
        try {
            await db.albums.clear();
            await db.orders.clear();
            logger.info('[OfflineStorage] Cleared all offline data');
        } catch (error) {
            logger.error('[OfflineStorage] Failed to clear all data', error);
        }
    }
};
