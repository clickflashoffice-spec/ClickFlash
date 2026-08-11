import { logger } from '@/utils/logger';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(_dirname, '..', '..', 'pb_data', 'master.db');
    logger.info(`Opening DB at ${dbPath}`);
    const db = new Database(dbPath);

    logger.info('\n--- USERS ---');
    const users = db.prepare('SELECT id, name, role, email FROM users').all();
    console.table(users);

    logger.info('\n--- DAILY OBJECTIVES ---');
    const objectives = db.prepare('SELECT * FROM daily_objectives').all();
    console.table(objectives);

} catch (e) {
    logger.error('Error:', e);
}
