// backend/scripts/ReorganizeStorage.ts
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '../database/db';
import { UPLOAD_DIR, DB_FILE } from '../config/constants';
import { logger } from '../utils/logger';

/**
 * Maintenance Script: Law 12 Reorganization
 * Moves photos from root uploads folder to structured <albumId>/highres/ and <albumId>/thumbs/ 
 */

async function run() {
    logger.info('[Maintenance] Starting Law 12 Storage Reorganization...');

    const db = new DatabaseManager(DB_FILE);
    db.connect();

    const photos = db.query('SELECT id, albumId, url, thumbnailUrl, storagePath FROM photos');
    logger.info(`[Maintenance] Found ${photos.length} photos to audit.`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const photo of photos) {
        try {
            const albumId = photo.albumId;
            if (!albumId) continue;

            const albumDir = path.join(UPLOAD_DIR, albumId);
            const highResDir = path.join(albumDir, 'highres');
            const thumbsDir = path.join(albumDir, 'thumbs');

            // Create structure if missing
            [albumDir, highResDir, thumbsDir].forEach(d => {
                if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
            });

            // 1. Audit Main Photo
            const currentMainPath = path.isAbsolute(photo.url) ? photo.url : path.join(UPLOAD_DIR, photo.url);
            const fileName = path.basename(photo.url);
            const targetMainPath = path.join(highResDir, fileName);
            const targetRelativeUrl = `${albumId}/highres/${fileName}`;

            if (fs.existsSync(currentMainPath) && currentMainPath !== targetMainPath) {
                logger.info(`[Migrate] Moving ${fileName} -> ${albumId}/highres/`);
                fs.renameSync(currentMainPath, targetMainPath);

                db.run('UPDATE photos SET url = ?, storagePath = ? WHERE id = ?', [
                    targetRelativeUrl,
                    targetMainPath,
                    photo.id
                ]);
                migratedCount++;
            }

            // 2. Audit Thumbnail
            if (photo.thumbnailUrl) {
                const currentThumbPath = path.join(UPLOAD_DIR, photo.thumbnailUrl);
                const thumbFileName = path.basename(photo.thumbnailUrl);
                const targetThumbPath = path.join(thumbsDir, thumbFileName);
                const targetRelativeThumbUrl = `${albumId}/thumbs/${thumbFileName}`;

                if (fs.existsSync(currentThumbPath) && currentThumbPath !== targetThumbPath) {
                    logger.info(`[Migrate] Moving thumb ${thumbFileName} -> ${albumId}/thumbs/`);
                    fs.renameSync(currentThumbPath, targetThumbPath);

                    db.run('UPDATE photos SET thumbnailUrl = ? WHERE id = ?', [
                        targetRelativeThumbUrl,
                        photo.id
                    ]);
                }
            }

        } catch (err: any) {
            logger.error(`[Error] Failed to migrate photo ${photo.id}:`, err.message);
            errorCount++;
        }
    }

    logger.info(`[Maintenance] Completed.`);
    logger.info(`- Migrated: ${migratedCount}`);
    logger.info(`- Errors: ${errorCount}`);

    db.maintenance(); // VACUUM and ANALYZE
    db.close();
}

run().catch(logger.error);
