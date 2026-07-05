
import Database from 'better-sqlite3-multiple-ciphers';
import { logger } from './utils/logger';

const dbPath = 'E:/ClickFlash/master-app/react-new-backup/pb_data/master.db';

try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    logger.info('--- DATABASE SCHEMA AUDIT ---');
    for (const table of tables as any) {
        logger.info(`\nTable: ${table.name}`);
        const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`).get() as any;
        logger.info(schema.sql);
        
        const indexes = db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='${table.name}'`).all();
        if (indexes.length > 0) {
            logger.info('Indexes:');
            indexes.forEach((idx: any) => {
                if (idx.sql) logger.info(`  ${idx.sql}`);
            });
        }
    }
} catch (err) {
    logger.error('Error reading schema:', err);
}
