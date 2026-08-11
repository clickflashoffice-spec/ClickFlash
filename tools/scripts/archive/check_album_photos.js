import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = 'e:/master os/New folder/master app python/backend/pb_data/database.sqlite';
const albumId = 'e5759389-c8be-410d-88a8-a34d822db25c';

try {
    const db = new Database(DB_PATH, { readonly: true, timeout: 5000 });
    logger.info('Connected to DB');

    const count = db.prepare('SELECT COUNT(*) as total FROM photos WHERE albumId = ?').get(albumId);
    logger.info(`Total photos in album ${albumId}:`, count.total);

    if (count.total > 0) {
        const samples = db.prepare('SELECT id, albumId, url, thumbnailUrl FROM photos WHERE albumId = ? LIMIT 5').all(albumId);
        logger.info('Sample Photo Records:');
        logger.info(JSON.stringify(samples, null, 2));
    }

    db.close();
} catch (err) {
    logger.error('Error:', err.message);
}
