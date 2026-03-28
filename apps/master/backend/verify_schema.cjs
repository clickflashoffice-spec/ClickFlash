const Database = require('better-sqlite3');
const dbPath = 'e:/ClickFlash/apps/management/pb_data/data.db';

console.log(`Checking schema for: ${dbPath}`);
const db = new Database(dbPath);

try {
    const tableInfo = db.prepare('PRAGMA table_info(albums)').all();
    console.log('Columns in albums:');
    tableInfo.forEach(col => console.log(`- ${col.name}`));

    const hasDeskId = tableInfo.some(col => col.name === 'desk_id');
    const hasOriginalId = tableInfo.some(col => col.name === 'original_id');

    if (hasDeskId && hasOriginalId) {
        console.log('✅ Success: desk_id and original_id found in albums table.');
    } else {
        console.log('❌ Failure: desk_id or original_id missing in albums table.');
    }
} catch (err) {
    console.error('❌ Error checking schema:', err.message);
} finally {
    db.close();
}
