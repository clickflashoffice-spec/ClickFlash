const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = 'e:/ClickFlash/apps/management/pb_data/data.db';
const migrationPath = 'e:/ClickFlash/apps/management/backend/migrations/011_multimaster_compatibility.sql';

console.log(`Applying migration to: ${dbPath}`);
const db = new Database(dbPath);

try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(sql);
    console.log('✅ Success!');
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('ℹ️ Already migrated.');
    } else {
        console.error('❌ Error:', err.message);
    }
} finally {
    db.close();
}
