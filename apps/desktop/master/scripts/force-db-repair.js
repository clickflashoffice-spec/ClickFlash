
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'pb_data');
const DB_PATH = path.join(DATA_DIR, 'master.db');
const LOG_FILE = path.join(process.cwd(), 'repair.log');

function log(msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

log(`[Repair] details: 
  DATA_DIR: ${DATA_DIR}
  DB_PATH: ${DB_PATH}
`);

if (!fs.existsSync(DB_PATH)) {
    console.error(`[Repair] FATAL: Database file not found at ${DB_PATH}`);
    process.exit(1);
}

const db = new Database(DB_PATH);
console.log('[Repair] Connected to database.');

const SCHEMA_FACE_INDEXING_QUEUE = `
CREATE TABLE IF NOT EXISTS face_indexing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photoId TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photoId) REFERENCES photos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_face_queue_status ON face_indexing_queue(status);
CREATE INDEX IF NOT EXISTS idx_face_queue_photoId ON face_indexing_queue(photoId);
`;

const CHECK_ORDERS_COLUMN = `
SELECT count(*) as count FROM pragma_table_info('orders') WHERE name='created';
`;

const CHECK_ORDERS_CREATED_AT = `
SELECT count(*) as count FROM pragma_table_info('orders') WHERE name='created_at';
`;

try {
    // 1. Fix Face Indexing Queue
    console.log('[Repair] Checking "face_indexing_queue" table...');
    db.exec(SCHEMA_FACE_INDEXING_QUEUE);
    console.log('[Repair] "face_indexing_queue" table verification/creation SUCCESS.');

    // 2. Fix Orders Column
    console.log('[Repair] Checking "orders" table schema...');

    const hasCreated = db.prepare(CHECK_ORDERS_COLUMN).get().count > 0;
    const hasCreatedAt = db.prepare(CHECK_ORDERS_CREATED_AT).get().count > 0;

    console.log(`[Repair] Orders table audit: has_created=${hasCreated}, has_created_at=${hasCreatedAt}`);

    if (hasCreated && !hasCreatedAt) {
        console.log('[Repair] DETECTED OLD SCHEMA: "created" column exists but "created_at" missing.');
        console.log('[Repair] Migrating "created" -> "created_at"...');
        db.exec(`ALTER TABLE orders RENAME COLUMN created TO created_at;`);
        console.log('[Repair] Column rename SUCCESS.');
    } else if (!hasCreatedAt) {
        console.warn('[Repair] WARNING: Neither "created" nor "created_at" found? Or strict schema.');
        // Optional: Add created_at if missing entirely
        // db.exec(`ALTER TABLE orders ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;`);
    } else {
        console.log('[Repair] Schema looks correct (has created_at).');
    }

    console.log('[Repair] Database repair sequence completed successfully.');

} catch (err) {
    console.error('[Repair] FAILED:', err);
    process.exit(1);
} finally {
    db.close();
}
