
import { logger } from "@/utils/logger";
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('pb_data/master.db');
const UPLOAD_DIR = path.resolve('pb_data/uploads');

logger.info('--- DEEP AUDIT LITE (JS) ---');

if (!fs.existsSync(dbPath)) {
    logger.error('DB Not Found');
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

try {
    // 1. ENGINE
    logger.info('[1] Engine Diagnostics...');
    logger.info('Journal Mode:', db.pragma('journal_mode'));
    logger.info('Synchronous:', db.pragma('synchronous'));
    logger.info('Busy Timeout:', db.pragma('busy_timeout'));

    // Skip integrity_check because it might hang on this system

    // 2. QUERY PLAN
    logger.info('\n[2] Index Audit...');
    const plan = db.prepare('EXPLAIN QUERY PLAN SELECT 1 FROM photos WHERE albumId = ?').get('dummy_id');
    logger.info('Plan:', JSON.stringify(plan));

    // 3. STATS
    logger.info('\n[3] System Stats...');
    const total = db.prepare('SELECT count(*) as count FROM photos').get();
    const orphans = db.prepare('SELECT count(*) as count FROM photos WHERE albumId NOT IN (SELECT id FROM albums)').get();
    const zeroByte = db.prepare('SELECT count(*) as count FROM photos WHERE fileSize = 0').get();

    logger.info('Total Photos:', total.count);
    logger.info('Orphaned Photos:', orphans.count);
    logger.info('Zero-Byte Photos:', zeroByte.count);

    // 4. FIS SCAN
    logger.info('\n[4] Filesystem Sample...');
    const sample = db.prepare('SELECT url FROM photos LIMIT 5').all();
    sample.forEach(p => {
        const full = path.join(UPLOAD_DIR, p.url);
        logger.info(`- ${p.url}: ${fs.existsSync(full) ? 'OK' : 'MISSING'}`);
    });

} catch (e) {
    logger.error('Error:', e.message);
} finally {
    db.close();
}
