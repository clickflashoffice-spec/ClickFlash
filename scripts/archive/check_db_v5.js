import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath);

try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='photos'").get();
    logger.info('Schema:', schema.sql);

    const sample = db.prepare("SELECT * FROM photos LIMIT 1").get();
    logger.info('Sample Record:', JSON.stringify(sample, null, 2));

} catch (err) {
    logger.error('Error:', err.message);
} finally {
    db.close();
}
