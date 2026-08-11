import { logger } from '@/utils/logger';


const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath, { readonly: true, timeout: 5000 });

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    logger.info('Tables:', tables.map(t => t.name).join(', '));
} catch (err) {
    logger.error('Database error:', err.message);
} finally {
    db.close();
}
