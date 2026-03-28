
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve('pb_data/master.db');
console.log('--- Read-Only Audit ---');

if (!fs.existsSync(dbPath)) {
    console.error('DB Not Found');
    process.exit(1);
}

// Open in read-only mode to avoid being blocked by writers
const db = new Database(dbPath, { readonly: true, timeout: 5000 });
try {
    const journal = db.pragma('journal_mode');
    console.log('Journal Mode:', journal);

    // Target from user's logs
    const targetAlbumId = '4f0def33-13db-4f00-bc9f-f977298aac9d';
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(targetAlbumId);

    if (album) {
        console.log('✅ Found Album:', album);
    } else {
        console.log('❌ Album NOT FOUND:', targetAlbumId);

        // Find if *any* album exists
        const count = db.prepare('SELECT count(*) as count FROM albums').get();
        console.log('Total Albums in DB:', count.count);

        // Find recent albums
        const recent = db.prepare('SELECT id, title, created_at FROM albums ORDER BY created_at DESC LIMIT 5').all();
        console.log('Recent Albums:', recent);
    }

    const photographerId = album ? album.photographerId : null;
    if (photographerId) {
        const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(photographerId);
        console.log('Photographer User:', user ? user : 'NOT FOUND');
    }

} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
