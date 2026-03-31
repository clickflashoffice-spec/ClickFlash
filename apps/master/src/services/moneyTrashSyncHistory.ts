/**
 * MoneyTrash Sync History Service
 * 
 * Tracks and displays sync history between MoneyTrash uploads and Master Portal.
 * Provides detailed logs of upload synchronization events.
 */

import { logger } from '@/utils/logger';

export interface SyncHistoryEntry {
    id: string;
    timestamp: string;
    source: 'moneytrash' | 'manual';
    action: 'upload' | 'delete' | 'archive' | 'expire' | 'sync';
    status: 'success' | 'failed' | 'partial';
    albumId?: string;
    albumName?: string;
    photosProcessed: number;
    photosFailed: number;
    totalSizeMB: number;
    duration: number;
    error?: string;
    metadata?: Record<string, unknown>;
}

export interface SyncHistoryStats {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalPhotosProcessed: number;
    totalDataMB: number;
    averageDuration: number;
    lastSyncTime: string | null;
    syncStreak: number;
}

export interface SyncHistoryFilter {
    status?: 'success' | 'failed' | 'partial';
    action?: 'upload' | 'delete' | 'archive' | 'expire' | 'sync';
    dateFrom?: string;
    dateTo?: string;
    searchTerm?: string;
}

class MoneyTrashSyncHistoryService {
    private static instance: MoneyTrashSyncHistoryService;
    private history: SyncHistoryEntry[] = [];
    private listeners: Set<(entry: SyncHistoryEntry) => void> = new Set();
    private storageKey = 'moneytrash_sync_history';
    private maxEntries = 500;

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): MoneyTrashSyncHistoryService {
        if (!MoneyTrashSyncHistoryService.instance) {
            MoneyTrashSyncHistoryService.instance = new MoneyTrashSyncHistoryService();
        }
        return MoneyTrashSyncHistoryService.instance;
    }

    /**
     * Add a new sync history entry
     */
    public addEntry(entry: Omit<SyncHistoryEntry, 'id' | 'timestamp'>): SyncHistoryEntry {
        const fullEntry: SyncHistoryEntry = {
            ...entry,
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
        };

        this.history.unshift(fullEntry);

        // Keep only max entries
        if (this.history.length > this.maxEntries) {
            this.history = this.history.slice(0, this.maxEntries);
        }

        this.saveToStorage();
        this.notifyListeners(fullEntry);

        logger.info('[MoneyTrashSyncHistory] Entry added', {
            id: fullEntry.id,
            action: fullEntry.action,
            status: fullEntry.status,
        });

        return fullEntry;
    }

    /**
     * Log an upload sync event
     */
    public logUpload(params: {
        albumId: string;
        albumName: string;
        photosProcessed: number;
        photosFailed: number;
        totalSizeMB: number;
        duration: number;
        success: boolean;
        error?: string;
    }): SyncHistoryEntry {
        return this.addEntry({
            source: 'moneytrash',
            action: 'upload',
            status: params.photosFailed > 0 ? 'partial' : params.success ? 'success' : 'failed',
            albumId: params.albumId,
            albumName: params.albumName,
            photosProcessed: params.photosProcessed,
            photosFailed: params.photosFailed,
            totalSizeMB: params.totalSizeMB,
            duration: params.duration,
            error: params.error,
        });
    }

    /**
     * Log a delete event
     */
    public logDelete(params: {
        albumId: string;
        albumName: string;
        photosProcessed: number;
        success: boolean;
        error?: string;
    }): SyncHistoryEntry {
        return this.addEntry({
            source: 'moneytrash',
            action: 'delete',
            status: params.success ? 'success' : 'failed',
            albumId: params.albumId,
            albumName: params.albumName,
            photosProcessed: params.photosProcessed,
            photosFailed: params.success ? 0 : params.photosProcessed,
            totalSizeMB: 0,
            duration: 0,
            error: params.error,
        });
    }

    /**
     * Log an archive event
     */
    public logArchive(params: {
        albumId: string;
        albumName: string;
        photosProcessed: number;
        success: boolean;
        error?: string;
    }): SyncHistoryEntry {
        return this.addEntry({
            source: 'moneytrash',
            action: 'archive',
            status: params.success ? 'success' : 'failed',
            albumId: params.albumId,
            albumName: params.albumName,
            photosProcessed: params.photosProcessed,
            photosFailed: params.success ? 0 : params.photosProcessed,
            totalSizeMB: 0,
            duration: 0,
            error: params.error,
        });
    }

    /**
     * Log an expiration event
     */
    public logExpiration(params: {
        albumId: string;
        albumName: string;
        photosProcessed: number;
        success: boolean;
        error?: string;
    }): SyncHistoryEntry {
        return this.addEntry({
            source: 'moneytrash',
            action: 'expire',
            status: params.success ? 'success' : 'failed',
            albumId: params.albumId,
            albumName: params.albumName,
            photosProcessed: params.photosProcessed,
            photosFailed: params.success ? 0 : params.photosProcessed,
            totalSizeMB: 0,
            duration: 0,
            error: params.error,
        });
    }

    /**
     * Get all history entries
     */
    public getHistory(filter?: SyncHistoryFilter, limit: number = 100): SyncHistoryEntry[] {
        let filtered = [...this.history];

        if (filter) {
            if (filter.status) {
                filtered = filtered.filter(e => e.status === filter.status);
            }
            if (filter.action) {
                filtered = filtered.filter(e => e.action === filter.action);
            }
            if (filter.dateFrom) {
                filtered = filtered.filter(e => e.timestamp >= filter.dateFrom!);
            }
            if (filter.dateTo) {
                filtered = filtered.filter(e => e.timestamp <= filter.dateTo!);
            }
            if (filter.searchTerm) {
                const term = filter.searchTerm.toLowerCase();
                filtered = filtered.filter(e =>
                    e.albumName?.toLowerCase().includes(term) ||
                    e.albumId?.toLowerCase().includes(term) ||
                    e.error?.toLowerCase().includes(term)
                );
            }
        }

        return filtered.slice(0, limit);
    }

    /**
     * Get history statistics
     */
    public getStats(): SyncHistoryStats {
        const successfulSyncs = this.history.filter(e => e.status === 'success').length;
        const failedSyncs = this.history.filter(e => e.status === 'failed').length;

        const totalPhotosProcessed = this.history.reduce((acc, e) => acc + e.photosProcessed, 0);
        const totalDataMB = this.history.reduce((acc, e) => acc + e.totalSizeMB, 0);
        const totalDuration = this.history.reduce((acc, e) => acc + e.duration, 0);

        const lastSuccess = this.history.find(e => e.status === 'success');

        // Calculate sync streak (consecutive successful syncs)
        let syncStreak = 0;
        for (const entry of this.history) {
            if (entry.status === 'success' && entry.action === 'upload') {
                syncStreak++;
            } else if (entry.action === 'upload') {
                break;
            }
        }

        return {
            totalSyncs: this.history.length,
            successfulSyncs,
            failedSyncs,
            totalPhotosProcessed,
            totalDataMB,
            averageDuration: this.history.length > 0 ? totalDuration / this.history.length : 0,
            lastSyncTime: lastSuccess?.timestamp || null,
            syncStreak,
        };
    }

    /**
     * Get recent entries (last 24 hours)
     */
    public getRecentEntries(hours: number = 24): SyncHistoryEntry[] {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        return this.history.filter(e => e.timestamp >= cutoff);
    }

    /**
     * Get entries for a specific album
     */
    public getAlbumHistory(albumId: string): SyncHistoryEntry[] {
        return this.history.filter(e => e.albumId === albumId);
    }

    /**
     * Clear history
     */
    public clearHistory(): void {
        this.history = [];
        this.saveToStorage();
        logger.info('[MoneyTrashSyncHistory] History cleared');
    }

    /**
     * Delete specific entry
     */
    public deleteEntry(id: string): boolean {
        const index = this.history.findIndex(e => e.id === id);
        if (index !== -1) {
            this.history.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Subscribe to new entries
     */
    public subscribe(callback: (entry: SyncHistoryEntry) => void): () => void {
        this.listeners.add(callback);
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Export history as JSON
     */
    public exportHistory(): string {
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            entries: this.history,
            stats: this.getStats(),
        }, null, 2);
    }

    /**
     * Import history from JSON
     */
    public importHistory(json: string): { success: boolean; imported: number; error?: string } {
        try {
            const data = JSON.parse(json);
            if (!Array.isArray(data.entries)) {
                return { success: false, imported: 0, error: 'Invalid format: entries array not found' };
            }

            const before = this.history.length;
            this.history = [...data.entries, ...this.history].slice(0, this.maxEntries);
            const after = this.history.length;

            this.saveToStorage();

            return { success: true, imported: after - before };
        } catch (err) {
            return { success: false, imported: 0, error: `Parse error: ${err}` };
        }
    }

    /**
     * Notify listeners of new entry
     */
    private notifyListeners(entry: SyncHistoryEntry): void {
        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (err) {
                logger.error('[MoneyTrashSyncHistory] Listener error', err);
            }
        }
    }

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            // Don't store too much data - only store metadata
            const toStore = this.history.map(e => ({
                ...e,
                metadata: undefined, // Remove large metadata
            }));
            localStorage.setItem(this.storageKey, JSON.stringify(toStore));
        } catch (err) {
            logger.error('[MoneyTrashSyncHistory] Failed to save to storage', err);
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.history = JSON.parse(stored);
                logger.info('[MoneyTrashSyncHistory] History loaded', { count: this.history.length });
            }
        } catch (err) {
            logger.error('[MoneyTrashSyncHistory] Failed to load from storage', err);
            this.history = [];
        }
    }
}

export const moneyTrashSyncHistory = MoneyTrashSyncHistoryService.getInstance();
export default moneyTrashSyncHistory;
