// Quick fix script to clear stale touchOrdersFolder setting
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'pb_data', 'touch.db');
console.log('Opening database:', dbPath);

try {
    const db = new Database(dbPath);

    // Check current setting
    const current = db.prepare("SELECT * FROM settings WHERE key = 'touchOrdersFolder'").get();
    console.log('Current touchOrdersFolder setting:', current);

    // Delete the stale setting - Hot Folder will use default pb_data/orders
    const result = db.prepare("DELETE FROM settings WHERE key = 'touchOrdersFolder'").run();
    console.log('Deleted setting, changes:', result.changes);

    // Verify deletion
    const check = db.prepare("SELECT * FROM settings WHERE key = 'touchOrdersFolder'").get();
    console.log('After delete:', check || 'Setting removed');

    db.close();
    console.log('Done! Hot Folder will now use default path: pb_data/orders');
} catch (error) {
    console.error('Error:', error.message);
}
