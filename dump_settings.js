const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join('apps', 'master', 'pb_data', 'master.db');
if (!fs.existsSync(dbPath)) {
    console.error('Database not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);
try {
    const settings = db.prepare('SELECT * FROM settings').all();
    console.log(JSON.stringify(settings, null, 2));
} catch (error) {
    console.error('Error reading settings:', error);
} finally {
    db.close();
}
