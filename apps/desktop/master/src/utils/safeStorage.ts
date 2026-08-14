/**
 * Safe Storage Utility
 * Wraps localStorage to prevent QuotaExceededError crashes
 */
import { logger } from './logger';
import { db } from '../services/db';

export const safeStorage = {
    getItem(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            logger.warn(`[Storage] Failed to get item '${key}'`, e);
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            localStorage.setItem(key, value);
        } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
                logger.error(`[Storage] Quota Exceeded for '${key}'. Attempting IndexedDB fallback...`);

                try {
                    // Save to IndexedDB as fallback
                    await db.files.put({ id: `storage_${key}`, data: new Blob([value], { type: 'text/plain' }) });
                    logger.info(`[Storage] Successfully moved '${key}' to IndexedDB.`);
                } catch (dexieError) {
                    logger.error(`[Storage] Failed IndexedDB fallback. Clearing non-essential local storage.`);

                    // Clear non-essential data, preserving auth, user, and sidebar state
                    Object.keys(localStorage).forEach(k => {
                        if (k !== 'masterPortalUser' && k !== 'isSidebarCollapsed' && k !== 'authToken') {
                            localStorage.removeItem(k);
                        }
                    });
                }
            } else {
                logger.warn(`[Storage] Failed to set item '${key}'`, e);
            }
        }
    },

    removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            logger.warn(`[Storage] Failed to remove item '${key}'`, e);
        }
    },

    clear(): void {
        try {
            localStorage.clear();
        } catch (e) {
            logger.warn(`[Storage] Failed to clear storage`, e);
        }
    }
};
