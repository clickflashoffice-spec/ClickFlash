
const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'pb_data');
const DB_PATH = path.join(DATA_DIR, 'master.db');

const db = new Database(DB_PATH);

console.log('--- Checking Photos Table for Corrupted Paths ---');

const photos = db.prepare('SELECT id, url, thumbnailUrl, previewUrl FROM photos LIMIT 10').all();

photos.forEach(p => {
    console.log(`[${p.id}]`);
    console.log(`  URL: ${p.url}`);
    console.log(`  Thumb: ${p.thumbnailUrl}`);
    console.log(`  Preview: ${p.previewUrl}`);

    if (p.url && p.url.startsWith('http')) {
        console.log('  !! CORRUPTED URL DETECTED !!');
    }
});

const corruptedCount = db.prepare("SELECT COUNT(*) as count FROM photos WHERE url LIKE 'http%'").get();
console.log(`\nTotal potentially corrupted records: ${corruptedCount.count}`);

db.close();
