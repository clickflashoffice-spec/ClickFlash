import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath, { readonly: true, timeout: 5000 });

try {
    const recordId = 'j55shsnr47w5qre';
    logger.info(`Querying for photo id: ${recordId}`);

    // Check if table exists and schema
    const tableInfo = db.prepare("PRAGMA table_info(photos)").all();
    logger.info('Table Schema:', tableInfo.map(c => `${c.name} (${c.type})`).join(', '));

    // Check indices
    const indexList = db.prepare("PRAGMA index_list(photos)").all();
    logger.info('Indices:', indexList);

    const start = Date.now();
    const photo = db.prepare('SELECT id, albumId, url FROM photos WHERE id = ?').get(recordId);
    const duration = Date.now() - start;

    if (photo) {
        logger.info(`Found photo in ${duration}ms:`, photo);
    } else {
        logger.info(`Photo not found after ${duration}ms`);

        // Search by part of filename to see if ID is different
        const filenamePart = 'cf_img_1738567500589_9r5o57l0295n9c84';
        const byFilename = db.prepare("SELECT id, albumId, url FROM photos WHERE url LIKE ?").get(`%${filenamePart}%`);
        if (byFilename) {
            logger.info('Found photo by filename:', byFilename);
        } else {
            logger.info('Photo not found by filename either');
        }
    }
} catch (err) {
    logger.error('Database error:', err.message);
} finally {
    db.close();
}
