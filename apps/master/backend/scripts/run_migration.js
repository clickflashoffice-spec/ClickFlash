import { logger } from "@/utils/logger";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(_dirname, '../../pb_data/master.db');
logger.info('Connecting to database at:', dbPath);
const db = new Database(dbPath);

const migrationPath = path.join(_dirname, '../migrations/fix_login_history_schema.sql');
logger.info('Reading migration file:', migrationPath);

try {
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    logger.info('Executing migration...');
    db.exec(migrationSql);
    logger.info('Migration executed successfully.');
} catch (error) {
    logger.error('Migration failed:', error);
} finally {
    db.close();
}
