import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('apps/master/pb_data/master.db');
try {
    const db = new Database(dbPath, { verbose: logger.info });
    logger.info('Connected to master.db');

    // List tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    logger.info('Tables:', tables.map(t => t.name).join(', '));

    if (tables.some(t => t.name === 'photos')) {
        logger.info('\n--- Sample from photos table ---');
        const rows = db.prepare("SELECT * FROM photos LIMIT 5").all();
        logger.info(JSON.stringify(rows, null, 2));

        logger.info('\n--- photos table schema ---');
        const columns = db.prepare("PRAGMA table_info(photos)").all();
        logger.info(JSON.stringify(columns, null, 2));
    } else {
        logger.info('Table "photos" not found.');
    }

    db.close();
} catch (err) {
    logger.error('Error:', err.message);
    process.exit(1);
}
