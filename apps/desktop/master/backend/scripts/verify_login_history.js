import { logger } from '@/utils/logger';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'pb_data', 'master.db');
logger.info(`Checking database at: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    logger.error('Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

logger.info('Checking for login_history table...');
const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_history'").get();

if (table) {
    logger.info('✅ login_history table exists.');
} else {
    logger.info('❌ login_history table is MISSING. Attempting to create it...');

    const schemaPath = path.join(_dirname, '..', 'migrations', 'fix_login_history_schema.sql');
    if (!fs.existsSync(schemaPath)) {
        logger.error('Migration file not found at:', schemaPath);
        process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
        db.exec(schema);
        logger.info('✅ Successfully created login_history table.');
    } catch (err) {
        logger.error('❌ Failed to create table:', err.message);
    }
}

// Verify columns
try {
    const columns = db.prepare("PRAGMA table_info(login_history)").all();
    logger.info('\nTable Schema:');
    columns.forEach(col => logger.info(` - ${col.name} (${col.type})`));
} catch (err) {
    logger.error('Error reading schema:', err.message);
}
