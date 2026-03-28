const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'apps/master/backend/database.sqlite');
const db = new Database(dbPath);

try {
    console.log("Applying isFavorite migration...");
    db.exec("ALTER TABLE photos ADD COLUMN isFavorite INTEGER DEFAULT 0;");
    console.log("Success!");
} catch (err) {
    if (err.message.includes("duplicate column name")) {
        console.log("Column already exists.");
    } else {
        console.error(err);
    }
} finally {
    db.close();
}
