const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = 'e:/ClickFlash/apps/management/pb_data/data.db';
const migrationPath = 'e:/ClickFlash/apps/management/backend/migrations/011_multimaster_compatibility.sql';

console.log(`Checking/Applying migration to: ${dbPath}`);
// Set busy timeout to 30 seconds
const db = new Database(dbPath, { timeout: 30000 });

try {
    const tableInfo = db.prepare('PRAGMA table_info(albums)').all();
    const needsMigration = !tableInfo.some(col => col.name === 'desk_id');

    if (needsMigration) {
        console.log('Applying migration...');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        db.exec(sql);
        console.log('✅ Migration applied successfully.');
    } else {
        console.log('ℹ️ Database already migrated.');
    }
} catch (err) {
    console.error('❌ Error:', err.message);
} finally {
    db.close();
}
