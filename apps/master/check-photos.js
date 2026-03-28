// Check thumbnailUrl values in database after migration
const Database = require('better-sqlite3');
const db = new Database('e:/ClickFlash/apps/master/pb_data/master.db');

const photos = db.prepare('SELECT id, url, thumbnailUrl, tinyUrl FROM photos LIMIT 5').all();

console.log('Photo URLs after migration:');
photos.forEach((p, i) => {
    console.log(`\n${i + 1}. Photo ID: ${p.id.substring(0, 8)}...`);
    console.log(`   url: ${p.url}`);
    console.log(`   thumbnailUrl: ${p.thumbnailUrl || 'NULL'}`);
    console.log(`   tinyUrl: ${p.tinyUrl || 'NULL'}`);
});

db.close();
