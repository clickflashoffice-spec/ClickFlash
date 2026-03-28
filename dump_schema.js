const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'apps/master/backend/database.sqlite');
const db = new Database(dbPath);

try {
    const tableInfo = db.prepare("PRAGMA table_info(photos)").all();
    console.log("Column Names:");
    tableInfo.forEach(col => console.log(`- ${col.name}`));
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
