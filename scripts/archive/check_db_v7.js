import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath);

try {
    const rowCount = db.prepare('SELECT COUNT(*) as count FROM photos').get();
    logger.info('Row count:', rowCount.count);

    const indices = db.prepare("PRAGMA index_list('photos')").all();
    logger.info('Indices:', JSON.stringify(indices, null, 2));

    for (const idx of indices) {
        const info = db.prepare(`PRAGMA index_info('${idx.name}')`).all();
        logger.info(`Index Info for ${idx.name}:`, JSON.stringify(info, null, 2));
    }

} catch (err) {
    logger.error('Error:', err.message);
} finally {
    db.close();
}
