import { logger } from '@/utils/logger';

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'apps', 'master', 'pb_data', 'master.db');
const db = new Database(dbPath);

logger.info('--- Photos Table Sample (URL focus) ---');
const photos = db.prepare('SELECT id, albumId, url, title FROM photos LIMIT 5').all();
logger.info(JSON.stringify(photos, null, 2));

db.close();
