import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'backend', 'db', 'master.db');
const db = new Database(dbPath, { readonly: true });

const photoId = 'f6a8a7f1-10d0-4e3a-97bc-8e614c78b646'; // ID from user logs return 404

try {
    const row = db.prepare(`
    SELECT id, title, originalFilename, url, thumbnailUrl, previewUrl, tinyUrl, albumId 
    FROM photos 
    WHERE id = ?
  `).get(photoId);

    if (row) {
        logger.info('--- Photo Record ---');
        logger.info(JSON.stringify(row, null, 2));

        if (row.tinyUrl) {
            const tinyPath = path.join(__dirname, 'backend', 'uploads', row.tinyUrl);
            logger.info(`\nChecking Tiny File: ${tinyPath}`);
            logger.info(`Exists: ${fs.existsSync(tinyPath)}`);
        } else {
            logger.info('\n[!] tinyUrl is NULL or empty.');
            if (row.thumbnailUrl) {
                const expectedTiny = row.thumbnailUrl.replace('_thumb.jpg', '_tiny.webp').replace('_thumb.jpeg', '_tiny.webp').replace('_thumb.png', '_tiny.webp');
                logger.info(`Expected Tiny Path would be: ${expectedTiny}`);
                const expectedFullPath = path.join(__dirname, 'backend', 'uploads', expectedTiny);
                logger.info(`Checking if Expected File Exists: ${expectedFullPath}`);
                logger.info(`Exists: ${fs.existsSync(expectedFullPath)}`);
            }
        }
    } else {
        logger.info(`No record found for photo: ${filename}`);
    }
} catch (error) {
    logger.error('Error querying database:', error);
}
