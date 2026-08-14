const Database = require('better-sqlite3');
const db = new Database('pb_data/master.db');

try {
    db.prepare("ALTER TABLE photos ADD COLUMN sync_status TEXT DEFAULT 'pending'").run();
    console.log('Added sync_status');
} catch (e) {
    console.log('sync_status might already exist:', e.message);
}

try {
    db.prepare("ALTER TABLE photos ADD COLUMN sync_id TEXT").run();
    console.log('Added sync_id');
} catch (e) {
    console.log('sync_id might already exist:', e.message);
}
