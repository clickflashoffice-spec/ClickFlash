import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath);

try {
    const filename = 'cf_20250203_081835616.jpg';
    const photo = db.prepare('SELECT id, albumId, url FROM photos WHERE url LIKE ?').get(`%${filename}%`);

    if (photo) {
        logger.info('Found photo:', JSON.stringify(photo, null, 2));
    } else {
        logger.info('Photo not found for filename:', filename);
        // List some photos to see format
        const somePhotos = db.prepare('SELECT id, albumId, url FROM photos LIMIT 5').all();
        logger.info('Sample photos:', JSON.stringify(somePhotos, null, 2));
    }

} catch (err) {
    logger.error('Error:', err.message);
} finally {
    db.close();
}
