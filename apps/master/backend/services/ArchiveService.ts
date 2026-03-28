import path from 'path';
import fs from 'fs';
import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';
import { DATA_DIR } from '../config/constants';

/**
 * Phase 21: Storage Archiving Service
 * Moves old/synced metadata to an external archive.db to keep master.db small and fast.
 */
export class ArchiveService {
    private static archiveDbPath = path.join(DATA_DIR, 'archive.db');

    /**
     * Initializes the archive database by ensuring the file exists 
     * and has the same schema as necessary tables.
     */
    static async initialize(dbManager: DatabaseManager, logger: Logger) {
        if (!fs.existsSync(this.archiveDbPath)) {
            logger.info('[ArchiveService] Archive DB not found. Initializing archive.db...');
        }

        try {
            // Attach the archive database
            dbManager.exec(`ATTACH DATABASE '${this.archiveDbPath}' AS archive`);

            // Create tables in archive if they don't exist
            // We use the same schema as master.db
            dbManager.exec(`
                CREATE TABLE IF NOT EXISTS archive.albums AS SELECT * FROM main.albums WHERE 1=0;
                CREATE TABLE IF NOT EXISTS archive.photos AS SELECT * FROM main.photos WHERE 1=0;
                CREATE TABLE IF NOT EXISTS archive.orders AS SELECT * FROM main.orders WHERE 1=0;
                
                -- Add archival metadata to archive tables if not present
                -- This allows tracking when items were archived
            `);

            // Try adding archived_at column to archive tables if it doesn't exist
            const tables = ['albums', 'photos', 'orders'];
            for (const table of tables) {
                try {
                    dbManager.exec(`ALTER TABLE archive.${table} ADD COLUMN archived_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
                } catch (e) {
                    // Column likely already exists
                }
            }

            logger.info('[ArchiveService] Archive DB initialized and attached successfully.');
        } catch (error: any) {
            logger.error('[ArchiveService] Failed to initialize archive:', error.message);
        }
    }

    /**
     * Moves a fully synced album and its associated photos and orders to cold storage.
     */
    static async archiveAlbum(dbManager: DatabaseManager, logger: Logger, albumId: string) {
        logger.info(`[ArchiveService] Archiving album ${albumId}...`);

        try {
            await dbManager.transaction(() => {
                // 1. Ensure archive is attached (in case of reconnection)
                try {
                    dbManager.exec(`ATTACH DATABASE '${this.archiveDbPath}' AS archive`);
                } catch (e: any) {
                    if (!e.message.includes('already in use')) throw e;
                }

                // 2. Transmit Orders
                dbManager.run(`
                    INSERT INTO archive.orders 
                    SELECT *, CURRENT_TIMESTAMP as archived_at 
                    FROM main.orders WHERE albumId = ?
                `, [albumId]);

                // 3. Transmit Photos
                dbManager.run(`
                    INSERT INTO archive.photos 
                    SELECT *, CURRENT_TIMESTAMP as archived_at 
                    FROM main.photos WHERE albumId = ?
                `, [albumId]);

                // 4. Transmit Album
                dbManager.run(`
                    INSERT INTO archive.albums 
                    SELECT *, CURRENT_TIMESTAMP as archived_at 
                    FROM main.albums WHERE id = ?
                `, [albumId]);

                // 5. Purge from Main
                dbManager.run(`DELETE FROM main.photos WHERE albumId = ?`, [albumId]);
                dbManager.run(`DELETE FROM main.orders WHERE albumId = ?`, [albumId]);
                dbManager.run(`DELETE FROM main.albums WHERE id = ?`, [albumId]);
            })();

            logger.info(`[ArchiveService] Successfully archived album ${albumId} and its dependencies.`);
            return true;
        } catch (error: any) {
            logger.error(`[ArchiveService] Failed to archive album ${albumId}:`, error.message);
            return false;
        }
    }

    /**
     * Checks for albums that are candidates for archiving.
     * Candidate:
     * 1. Album marked as 'completed'.
     * 2. All photos in the album have sync_status = 'synced'.
     * 3. Album created_at > 30 days ago (Reduced from 90 for more aggressive cleanup).
     */
    static async checkAndArchiveSyncCandidates(dbManager: DatabaseManager, logger: Logger) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const cutoffIso = cutoffDate.toISOString();

        // Query to find albums where:
        // - status is completed
        // - created_at < cutoff
        // - NO photos linked to this album have sync_status != 'synced'
        const query = `
            SELECT a.id 
            FROM main.albums a
            WHERE a.status = 'completed' 
              AND a.created_at < ?
              AND NOT EXISTS (
                  SELECT 1 FROM main.photos p 
                  WHERE p.albumId = a.id 
                  AND p.sync_status != 'synced'
              )
        `;

        const candidates = dbManager.query<{ id: string }>(query, [cutoffIso]);

        if (candidates.length > 0) {
            logger.info(`[ArchiveService] Found ${candidates.length} archival candidates.`);
            for (const candidate of candidates) {
                await this.archiveAlbum(dbManager, logger, candidate.id);
            }
        }
    }
}
