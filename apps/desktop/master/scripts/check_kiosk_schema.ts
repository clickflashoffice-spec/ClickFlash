
import { DatabaseManager } from '../backend/database/db';
import path from 'path';
import { logger } from '@/utils/logger';

const DATA_DIR = path.join(process.cwd(), 'pb_data');
const DB_FILE = path.join(DATA_DIR, 'master.db');

async function checkSchema() {
    logger.info('Checking database:', DB_FILE);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    try {
        const columns = db.query("PRAGMA table_info(kiosks)");
        logger.info('Columns in kiosks table:', columns.map((c: any) => c.name));

        const hasUpload = columns.some((c: any) => c.name === 'uploadFolderPath');
        const hasOrders = columns.some((c: any) => c.name === 'ordersFolderPath');

        logger.info('Has uploadFolderPath:', hasUpload);
        logger.info('Has ordersFolderPath:', hasOrders);

    } catch (e) {
        logger.error('Error:', e);
    }
}

checkSchema();
