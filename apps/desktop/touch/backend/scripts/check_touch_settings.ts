import { logger } from '../../src/utils/logger';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Path to Touch's data. Typically in pb_data derived from CWD
const DATA_DIR = path.join(process.cwd(), 'pb_data');

const findDb = (dir: string): string | null => {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    return files.find((f: string) => f.endsWith('.db') && !f.includes('session')) || null;
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
    const settings = db.prepare("SELECT key, value FROM settings WHERE key IN ('touchUploadFolder', 'touchOrdersFolder', 'kioskId')").all() as Array<{key: string, value: string}>;

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

} catch (err: unknown) {
    if (err instanceof Error) {
        logger.error(`Error reading settings: ${err.message}`);
    } else {
        logger.error('Error reading settings');
    }
}
