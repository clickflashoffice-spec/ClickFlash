import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'pb_data', 'touch.db');
logger.info(`[Check] Opening database at ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    // Check Settings
    const kioskId = db.prepare("SELECT value FROM settings WHERE key = 'kioskId'").get();
    const kioskName = db.prepare("SELECT value FROM settings WHERE key = 'kioskName'").get();

    logger.info('\n--- Current Database Settings ---');
    logger.info(`kioskId:   ${kioskId ? kioskId.value : '(missing)'}`);
    logger.info(`kioskName: ${kioskName ? kioskName.value : '(missing)'}`);

    // Check Kiosks Table (for redundancy)
    const kiosks = db.prepare("SELECT * FROM kiosks").all();
    logger.info(`\n--- Kiosks Table (${kiosks.length} records) ---`);
    kiosks.forEach(k => logger.info(k));

    logger.info('\n[Check] Validation Complete.');
} catch (error) {
    logger.error('[Check] Failed:', error.message);
}
