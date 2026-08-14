import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'db', 'master.db');
const db = new Database(dbPath, { readonly: true });

// Partial ID from user screenshot
const partialAlbumId = '018cd8e8';

try {
    // 1. Find the full album ID
    const album = db.prepare(`SELECT id, title FROM albums WHERE id LIKE ?`).get(`${partialAlbumId}%`);

    if (!album) {
        logger.info(`No album found matchin partial ID: ${partialAlbumId}`);
    } else {
        logger.info(`Found Album: ${album.title} (${album.id})`);

        // 2. Count photos
        const count = db.prepare(`SELECT count(*) as c FROM photos WHERE albumId = ?`).get(album.id);
        logger.info(`Total Photos in DB: ${count.c}`);

        // 3. List first 5 photos with paths
        const photos = db.prepare(`
        SELECT id, originalFilename, url, thumbnailUrl, tinyUrl, previewUrl 
        FROM photos 
        WHERE albumId = ? 
        LIMIT 5
    `).all(album.id);

        logger.info('\n--- Sample Photos ---');
        photos.forEach(p => {
            logger.info(`[${p.originalFilename}]`);
            logger.info(`  url: ${p.url}`);
            logger.info(`  tiny: ${p.tinyUrl}`);
            logger.info(`  thumb: ${p.thumbnailUrl}`);
        });
    }
} catch (error) {
    logger.error('Error querying database:', error);
}
