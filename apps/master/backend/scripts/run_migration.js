const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../pb_data/master.db');
console.log('Connecting to database at:', dbPath);
const db = new Database(dbPath);

const migrationPath = path.join(__dirname, '../migrations/fix_login_history_schema.sql');
console.log('Reading migration file:', migrationPath);

try {
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    console.log('Executing migration...');
    db.exec(migrationSql);
    console.log('Migration executed successfully.');
} catch (error) {
    console.error('Migration failed:', error);
} finally {
    db.close();
}
