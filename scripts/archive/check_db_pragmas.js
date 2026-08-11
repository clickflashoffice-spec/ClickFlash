import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = 'e:/master os/New folder/master app python/pb_data/master.db';

try {
    const db = new Database(DB_PATH, { readonly: true, timeout: 5000 });

    const journalMode = db.prepare('PRAGMA journal_mode').get().journal_mode;
    const synchronous = db.prepare('PRAGMA synchronous').get().synchronous;
    const lockingMode = db.prepare('PRAGMA locking_mode').get().locking_mode;

    logger.info('--- DB PRAGMAS ---');
    logger.info('Journal Mode:', journalMode);
    logger.info('Synchronous:', synchronous);
    logger.info('Locking Mode:', lockingMode);

    db.close();
} catch (err) {
    logger.error('Error:', err.message);
}
