import { logger } from '@/utils/logger';


import { fileURLToPath } from 'url';
import { dirname } from 'path';
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'pb_data', 'master.db');
// Adjust path if needed. Assuming running from master root or backend.
// Let's try absolute path based on file tree knowledge or just look at where 'monitoring' runs.
// The file tree showed: apps\New folder\master\backend\server.ts

// So invalid path above.

const db = new Database(path.join(_dirname, 'data', 'photography-os.db'), { verbose: logger.info });

try {
    const rows = db.prepare("SELECT id, name, status, ordersFolderPath FROM kiosks").all();
    logger.info(JSON.stringify(rows, null, 2));
} catch (err) {
    logger.error("DB Error", err);
}
