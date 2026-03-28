
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('pb_data/master.db');
const UPLOAD_DIR = path.resolve('pb_data/uploads');

console.log('--- DEEP AUDIT LITE (JS) ---');

if (!fs.existsSync(dbPath)) {
    console.error('DB Not Found');
    process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

try {
    // 1. ENGINE
    console.log('[1] Engine Diagnostics...');
    console.log('Journal Mode:', db.pragma('journal_mode'));
    console.log('Synchronous:', db.pragma('synchronous'));
    console.log('Busy Timeout:', db.pragma('busy_timeout'));

    // Skip integrity_check because it might hang on this system

    // 2. QUERY PLAN
    console.log('\n[2] Index Audit...');
    const plan = db.prepare('EXPLAIN QUERY PLAN SELECT 1 FROM photos WHERE albumId = ?').get('dummy_id');
    console.log('Plan:', JSON.stringify(plan));

    // 3. STATS
    console.log('\n[3] System Stats...');
    const total = db.prepare('SELECT count(*) as count FROM photos').get();
    const orphans = db.prepare('SELECT count(*) as count FROM photos WHERE albumId NOT IN (SELECT id FROM albums)').get();
    const zeroByte = db.prepare('SELECT count(*) as count FROM photos WHERE fileSize = 0').get();

    console.log('Total Photos:', total.count);
    console.log('Orphaned Photos:', orphans.count);
    console.log('Zero-Byte Photos:', zeroByte.count);

    // 4. FIS SCAN
    console.log('\n[4] Filesystem Sample...');
    const sample = db.prepare('SELECT url FROM photos LIMIT 5').all();
    sample.forEach(p => {
        const full = path.join(UPLOAD_DIR, p.url);
        console.log(`- ${p.url}: ${fs.existsSync(full) ? 'OK' : 'MISSING'}`);
    });

} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
