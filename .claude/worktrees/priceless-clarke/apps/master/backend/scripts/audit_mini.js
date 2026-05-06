
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('pb_data/master.db');
console.log('--- Mini Audit ---');
console.log('DB Path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('DB Not Found');
    process.exit(1);
}

const db = new Database(dbPath);
try {
    const journal = db.pragma('journal_mode');
    const timeout = db.pragma('busy_timeout');
    const fk = db.pragma('foreign_keys');
    console.log('Journal Mode:', journal);
    console.log('Busy Timeout:', timeout);
    console.log('Foreign Keys:', fk);

    const orphans = db.prepare('SELECT count(*) as count FROM photos WHERE albumId NOT IN (SELECT id FROM albums)').get();
    console.log('Orphaned Photos:', orphans.count);

    if (orphans.count > 0) {
        const samples = db.prepare('SELECT id, albumId FROM photos WHERE albumId NOT IN (SELECT id FROM albums) LIMIT 5').all();
        console.log('Sample Orphans:', samples);
    }

} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
