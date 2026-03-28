/**
 * Sync Checkpoint Service
 * 
 * Manages sync checkpoints to enable resuming interrupted sync operations.
 * 
 * Features:
 * - Save sync progress checkpoints
 * - Resume from last checkpoint
 * - Track processed albums and photos
 * - Persist checkpoints to localStorage
 * - Automatic checkpoint cleanup
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

class SyncCheckpointService {
    /**
     * Save a sync checkpoint
     */
    saveCheckpoint(checkpoint: SyncCheckpoint): void {
        try {
            const data = {
                ...checkpoint,
                timestamp: Date.now()
            };
            localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data));
            logger.debug('[SyncCheckpoint] Checkpoint saved', {
                albumsProcessed: checkpoint.albumsProcessed.length,
                photosProcessed: checkpoint.photosProcessed.length
            });
        } catch (error) {
            logger.warn('[SyncCheckpoint] Failed to save checkpoint', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Load the last sync checkpoint
     */
    loadCheckpoint(): SyncCheckpoint | null {
        try {
            const saved = localStorage.getItem(CHECKPOINT_KEY);
            if (!saved) {
                return null;
            }

            const checkpoint = JSON.parse(saved) as SyncCheckpoint & { timestamp: number };

            // Check if checkpoint is expired
            const age = Date.now() - checkpoint.timestamp;
            if (age > CHECKPOINT_EXPIRY_MS) {
                logger.info('[SyncCheckpoint] Checkpoint expired, clearing', { age });
                this.clearCheckpoint();
                return null;
            }

            logger.info('[SyncCheckpoint] Checkpoint loaded', {
                albumsProcessed: checkpoint.albumsProcessed.length,
                photosProcessed: checkpoint.photosProcessed.length,
                age: Math.floor(age / 1000) + 's'
            });

            return checkpoint;
        } catch (error) {
            logger.warn('[SyncCheckpoint] Failed to load checkpoint', {
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Clear the checkpoint
     */
    clearCheckpoint(): void {
        try {
            localStorage.removeItem(CHECKPOINT_KEY);
            logger.debug('[SyncCheckpoint] Checkpoint cleared');
        } catch (error) {
            logger.warn('[SyncCheckpoint] Failed to clear checkpoint', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Check if a checkpoint exists and is valid
     */
    hasValidCheckpoint(): boolean {
        const checkpoint = this.loadCheckpoint();
        return checkpoint !== null;
    }

    /**
     * Update checkpoint with current progress
     */
    updateCheckpoint(updates: Partial<SyncCheckpoint>): void {
        const existing = this.loadCheckpoint();
        if (existing) {
            this.saveCheckpoint({
                ...existing,
                ...updates,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Mark an album as processed
     */
    markAlbumProcessed(albumId: string): void {
        const checkpoint = this.loadCheckpoint();
        if (checkpoint) {
            if (!checkpoint.albumsProcessed.includes(albumId)) {
                checkpoint.albumsProcessed.push(albumId);
                this.saveCheckpoint(checkpoint);
            }
        }
    }

    /**
     * Mark a photo as processed
     */
    markPhotoProcessed(photoId: string): void {
        const checkpoint = this.loadCheckpoint();
        if (checkpoint) {
            if (!checkpoint.photosProcessed.includes(photoId)) {
                checkpoint.photosProcessed.push(photoId);
                this.saveCheckpoint(checkpoint);
            }
        }
    }

    /**
     * Check if an album has been processed
     */
    isAlbumProcessed(albumId: string): boolean {
        const checkpoint = this.loadCheckpoint();
        if (!checkpoint) return false;
        return checkpoint.albumsProcessed.includes(albumId);
    }

    /**
     * Check if a photo has been processed
     */
    isPhotoProcessed(photoId: string): boolean {
        const checkpoint = this.loadCheckpoint();
        if (!checkpoint) return false;
        return checkpoint.photosProcessed.includes(photoId);
    }

    /**
     * Get checkpoint statistics
     */
    getCheckpointStats(): {
        exists: boolean;
        albumsProcessed: number;
        photosProcessed: number;
        age?: number;
    } {
        const checkpoint = this.loadCheckpoint();
        if (!checkpoint) {
            return {
                exists: false,
                albumsProcessed: 0,
                photosProcessed: 0
            };
        }

        return {
            exists: true,
            albumsProcessed: checkpoint.albumsProcessed.length,
            photosProcessed: checkpoint.photosProcessed.length,
            age: Date.now() - checkpoint.timestamp
        };
    }
}

export const syncCheckpointService = new SyncCheckpointService();
export type { SyncCheckpoint };

