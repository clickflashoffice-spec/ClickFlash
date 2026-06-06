/**
 * Sync Checkpoint Service
 * 
 * Manages sync checkpoints to enable resuming interrupted sync operations.
 * 
 * Features:
 * - Save sync progress checkpoints to IndexedDB (Dexie)
 * - Resume from last checkpoint
 * - Track processed albums and photos
 * - Automatic checkpoint cleanup
 * - One-time migration from legacy localStorage
 * 
 * Checkpoint Structure:
 * {
 *   timestamp: number,
 *   albumsProcessed: string[], // Album IDs
 *   photosProcessed: string[], // Photo IDs
 *   currentAlbumId?: string,
 *   currentPhotoIndex?: number,
 *   totalAlbums: number,
 *   totalPhotos: number,
 *   bytesTransferred: number,
 *   startTime: number
 * }
 */

import { logger } from '../utils/logger';
import { db, SyncCheckpointRecord } from './db';

interface SyncCheckpoint {
    timestamp: number;
    albumsProcessed: string[];
    photosProcessed: string[];
    currentAlbumId?: string;
    currentPhotoIndex?: number;
    totalAlbums: number;
    totalPhotos: number;
    bytesTransferred: number;
    startTime: number;
    syncType: 'full' | 'incremental';
}

const CHECKPOINT_KEY = 'syncServiceCheckpoint';
const CHECKPOINT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHECKPOINT_ID = 'default';

let migrationAttempted = false;

async function migrateFromLocalStorage(): Promise<void> {
    if (migrationAttempted) return;
    migrationAttempted = true;
    try {
        const saved = localStorage.getItem(CHECKPOINT_KEY);
        if (!saved) return;

        const legacy = JSON.parse(saved) as SyncCheckpoint & { timestamp: number };
        const age = Date.now() - legacy.timestamp;
        if (age > CHECKPOINT_EXPIRY_MS) {
            logger.info('[SyncCheckpoint] Legacy checkpoint expired, clearing');
            localStorage.removeItem(CHECKPOINT_KEY);
            return;
        }

        await db.checkpoints.put({
            id: CHECKPOINT_ID,
            timestamp: legacy.timestamp,
            albumsProcessed: legacy.albumsProcessed || [],
            photosProcessed: legacy.photosProcessed || [],
            currentAlbumId: legacy.currentAlbumId,
            currentPhotoIndex: legacy.currentPhotoIndex,
            totalAlbums: legacy.totalAlbums || 0,
            totalPhotos: legacy.totalPhotos || 0,
            bytesTransferred: legacy.bytesTransferred || 0,
            startTime: legacy.startTime || legacy.timestamp,
            syncType: legacy.syncType || 'full',
        });

        localStorage.removeItem(CHECKPOINT_KEY);
        logger.info('[SyncCheckpoint] Migrated legacy checkpoint from localStorage to IndexedDB');
    } catch (error) {
        logger.warn('[SyncCheckpoint] Failed to migrate legacy checkpoint', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

class SyncCheckpointService {
    /**
     * Save a sync checkpoint
     */
    async saveCheckpoint(checkpoint: SyncCheckpoint): Promise<void> {
        try {
            const data: SyncCheckpointRecord = {
                id: CHECKPOINT_ID,
                timestamp: Date.now(),
                albumsProcessed: checkpoint.albumsProcessed,
                photosProcessed: checkpoint.photosProcessed,
                currentAlbumId: checkpoint.currentAlbumId,
                currentPhotoIndex: checkpoint.currentPhotoIndex,
                totalAlbums: checkpoint.totalAlbums,
                totalPhotos: checkpoint.totalPhotos,
                bytesTransferred: checkpoint.bytesTransferred,
                startTime: checkpoint.startTime,
                syncType: checkpoint.syncType,
            };
            await db.checkpoints.put(data);
            logger.debug('[SyncCheckpoint] Checkpoint saved to IndexedDB', {
                albumsProcessed: checkpoint.albumsProcessed.length,
                photosProcessed: checkpoint.photosProcessed.length,
            });
        } catch (error) {
            logger.warn('[SyncCheckpoint] Failed to save checkpoint', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Load the last sync checkpoint
     */
    async loadCheckpoint(): Promise<SyncCheckpoint | null> {
        await migrateFromLocalStorage();
        try {
            const record = await db.checkpoints.get(CHECKPOINT_ID);
            if (!record) {
                return null;
            }

            // Check if checkpoint is expired
            const age = Date.now() - record.timestamp;
            if (age > CHECKPOINT_EXPIRY_MS) {
                logger.info('[SyncCheckpoint] Checkpoint expired, clearing', { age });
                await this.clearCheckpoint();
                return null;
            }

            logger.info('[SyncCheckpoint] Checkpoint loaded from IndexedDB', {
                albumsProcessed: record.albumsProcessed.length,
                photosProcessed: record.photosProcessed.length,
                age: Math.floor(age / 1000) + 's',
            });

            return {
                timestamp: record.timestamp,
                albumsProcessed: record.albumsProcessed,
                photosProcessed: record.photosProcessed,
                currentAlbumId: record.currentAlbumId,
                currentPhotoIndex: record.currentPhotoIndex,
                totalAlbums: record.totalAlbums,
                totalPhotos: record.totalPhotos,
                bytesTransferred: record.bytesTransferred,
                startTime: record.startTime,
                syncType: record.syncType,
            };
        } catch (error) {
            logger.warn('[SyncCheckpoint] Failed to load checkpoint', {
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Clear the checkpoint
     */
    async clearCheckpoint(): Promise<void> {
        try {
            await db.checkpoints.delete(CHECKPOINT_ID);
            localStorage.removeItem(CHECKPOINT_KEY); // Also clear legacy
            logger.debug('[SyncCheckpoint] Checkpoint cleared');
        } catch (error) {
            logger.warn('[SyncCheckpoint] Failed to clear checkpoint', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Check if a checkpoint exists and is valid
     */
    async hasValidCheckpoint(): Promise<boolean> {
        const checkpoint = await this.loadCheckpoint();
        return checkpoint !== null;
    }

    /**
     * Update checkpoint with current progress
     */
    async updateCheckpoint(updates: Partial<SyncCheckpoint>): Promise<void> {
        const existing = await this.loadCheckpoint();
        if (existing) {
            await this.saveCheckpoint({
                ...existing,
                ...updates,
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Mark an album as processed
     */
    async markAlbumProcessed(albumId: string): Promise<void> {
        const checkpoint = await this.loadCheckpoint();
        if (checkpoint) {
            if (!checkpoint.albumsProcessed.includes(albumId)) {
                checkpoint.albumsProcessed.push(albumId);
                await this.saveCheckpoint(checkpoint);
            }
        }
    }

    /**
     * Mark a photo as processed
     */
    async markPhotoProcessed(photoId: string): Promise<void> {
        const checkpoint = await this.loadCheckpoint();
        if (checkpoint) {
            if (!checkpoint.photosProcessed.includes(photoId)) {
                checkpoint.photosProcessed.push(photoId);
                await this.saveCheckpoint(checkpoint);
            }
        }
    }

    /**
     * Check if an album has been processed
     */
    async isAlbumProcessed(albumId: string): Promise<boolean> {
        const checkpoint = await this.loadCheckpoint();
        if (!checkpoint) return false;
        return checkpoint.albumsProcessed.includes(albumId);
    }

    /**
     * Check if a photo has been processed
     */
    async isPhotoProcessed(photoId: string): Promise<boolean> {
        const checkpoint = await this.loadCheckpoint();
        if (!checkpoint) return false;
        return checkpoint.photosProcessed.includes(photoId);
    }

    /**
     * Get checkpoint statistics
     */
    async getCheckpointStats(): Promise<{
        exists: boolean;
        albumsProcessed: number;
        photosProcessed: number;
        age?: number;
    }> {
        const checkpoint = await this.loadCheckpoint();
        if (!checkpoint) {
            return {
                exists: false,
                albumsProcessed: 0,
                photosProcessed: 0,
            };
        }

        return {
            exists: true,
            albumsProcessed: checkpoint.albumsProcessed.length,
            photosProcessed: checkpoint.photosProcessed.length,
            age: Date.now() - checkpoint.timestamp,
        };
    }
}

export const syncCheckpointService = new SyncCheckpointService();
export type { SyncCheckpoint };
