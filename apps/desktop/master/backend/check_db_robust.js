import { logger } from '@/utils/logger';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbCandidatePaths = [
    path.join(_dirname, '../db/local.db'),
    path.join(_dirname, 'local.db'),
    path.join(_dirname, '../shared/local.db'),
    path.join(_dirname, '../../db/local.db')
];

let dbPath = null;
for (const p of dbCandidatePaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    logger.error('Could not find local.db');
    process.exit(1);
}

logger.info('Using DB:', dbPath);
const db = new Database(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
logger.info('Tables:', tables.map(t => t.name));

if (tables.some(t => t.name === 'orders')) {
    const cols = db.prepare("PRAGMA table_info(orders)").all();
    logger.info('Orders Columns:', cols.map(c => c.name));
}

if (tables.some(t => t.name === 'prospects')) {
    const cols = db.prepare("PRAGMA table_info(prospects)").all();
    logger.info('Prospects Columns:', cols.map(c => c.name));
}
