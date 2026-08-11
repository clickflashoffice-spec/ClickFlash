import { logger } from '@/utils/logger';

const DatabaseManager = require('./db');
const path = require('path');
const fs = require('fs');

async function testMigration() {
    const dbPath = path.join(__dirname, 'pb_data', 'data.db');
    const dbManager = new DatabaseManager(dbPath);

    logger.info('[Test] Connecting to database...');
    dbManager.connect();

    logger.info('[Test] Verifying albums table columns...');
    const tableInfo = dbManager.query("PRAGMA table_info(albums)");
    const columnNames = tableInfo.map(c => c.name);

    const requiredColumns = ['price_single', 'price_full', 'customer_email'];
    const missing = requiredColumns.filter(c => !columnNames.includes(c));

    if (missing.length === 0) {
        logger.info('[Test] SUCCESS: All required columns exist in albums table.');
    } else {
        logger.error('[Test] FAILED: Missing columns:', missing.join(', '));
        process.exit(1);
    }
}

testMigration().catch(err => {
    logger.error('[Test] Uncaught error:', err);
    process.exit(1);
});
