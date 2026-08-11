import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to Touch's data. Typically in pb_data derived from CWD
const DATA_DIR = path.join(process.cwd(), 'pb_data');
const DB_PATH = path.join(DATA_DIR, 'data.db'); // Touch uses 'data.db' usually? Check constants if needed. 
// Actually, let's verify if pb_data/data.db exists, otherwise check package.json or constants.
// For now assuming pb_data/data.db or pb_data/touch.db. 
// Let's try to find potential DB files in Touch pb_data first.

const findDb = (dir) => {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    return files.find(f => f.endsWith('.db') && !f.includes('session'));
};

const dbFile = findDb(DATA_DIR);

if (!dbFile) {
    logger.error(`No database found in ${DATA_DIR}`);
    process.exit(1);
}

const dbPath = path.join(DATA_DIR, dbFile);
logger.info(`Checking Touch Settings in: ${dbPath}`);

const db = new Database(dbPath);

try {
    const settings = db.prepare("SELECT key, value FROM settings WHERE key IN ('touchUploadFolder', 'touchOrdersFolder', 'kioskId')").all();

    logger.info('\n--- Touch App Settings ---');
    if (settings.length === 0) {
        logger.info('No specific touch settings found.');
    } else {
        settings.forEach(s => {
            logger.info(`${s.key}: ${s.value}`);
        });
    }

    // Also check current Kiosk ID if stored differently
    logger.info('\n--- Local Info ---');
    logger.info(`CWD: ${process.cwd()}`);
    logger.info(`Computed Upload Path: ${path.join(process.cwd(), 'pb_data', 'uploads')}`);
    logger.info(`Computed Orders Path: ${path.join(process.cwd(), 'pb_data', 'orders')}`);

} catch (err) {
    logger.error('Error reading settings:', err.message);
}
