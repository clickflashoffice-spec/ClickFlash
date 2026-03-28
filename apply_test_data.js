
const Database = require('e:/ClickFlash/master-app/react-new-backup/node_modules/better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = 'e:/ClickFlash/master-app/react-new-backup/backend/pb_data/master.db';
const sqlPath = 'e:/ClickFlash/master-app/react-new-backup/backend/migrations/040_test_data_gallery.sql';

console.log('Connecting to:', dbPath);
const db = new Database(dbPath);

console.log('Reading migration:', sqlPath);
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('Applying data...');
db.exec(sql);

console.log('Verifying data...');
const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
const albumCount = db.prepare('SELECT COUNT(*) as count FROM albums').get();
console.log('Orders in DB:', orderCount.count);
console.log('Albums in DB:', albumCount.count);

db.close();
console.log('Done.');
