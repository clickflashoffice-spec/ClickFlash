
import { logger } from "@/utils/logger";
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('pb_data/master.db');
logger.info('--- Mini Audit ---');
logger.info('DB Path:', dbPath);

if (!fs.existsSync(dbPath)) {
    logger.error('DB Not Found');
    process.exit(1);
}

const db = new Database(dbPath);
try {
    const journal = db.pragma('journal_mode');
    const timeout = db.pragma('busy_timeout');
    const fk = db.pragma('foreign_keys');
    logger.info('Journal Mode:', journal);
    logger.info('Busy Timeout:', timeout);
    logger.info('Foreign Keys:', fk);

    const orphans = db.prepare('SELECT count(*) as count FROM photos WHERE albumId NOT IN (SELECT id FROM albums)').get();
    logger.info('Orphaned Photos:', orphans.count);

    if (orphans.count > 0) {
        const samples = db.prepare('SELECT id, albumId FROM photos WHERE albumId NOT IN (SELECT id FROM albums) LIMIT 5').all();
        logger.info('Sample Orphans:', samples);
    }

} catch (e) {
    logger.error('Error:', e.message);
} finally {
    db.close();
}
