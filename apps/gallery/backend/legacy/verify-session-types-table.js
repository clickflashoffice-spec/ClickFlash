// backend/verify-session-types-table.js
// Quick script to verify the session_types table exists and is accessible

const DatabaseManager = require('./db');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

console.log('[Verification] Checking session_types table...');
console.log(`[Verification] Database: ${DB_FILE}`);

if (!require('fs').existsSync(DB_FILE)) {
    console.error(`[Verification] ERROR: Database file not found: ${DB_FILE}`);
    process.exit(1);
}

try {
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();

    // Check if table exists
    const tableExists = dbManager.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='session_types'
    `);

    if (!tableExists) {
        console.error('[Verification] ✗ session_types table does NOT exist');
        console.log('[Verification] Run: node apply-session-types-migration.js');
        process.exit(1);
    }

    console.log('[Verification] ✓ session_types table exists');

    // Get table structure
    const columns = dbManager.query('PRAGMA table_info(session_types)');
    console.log('\n[Verification] Table columns:');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
    });

    // Try to query the table
    const count = dbManager.get('SELECT COUNT(*) as count FROM session_types');
    console.log(`\n[Verification] Current records: ${count.count}`);

    // Try to insert a test record (then delete it)
    const testId = 'test-' + Date.now();
    try {
        dbManager.run(`
            INSERT INTO session_types (id, name, numberOfPhotos, price) 
            VALUES (?, ?, ?, ?)
        `, [testId, 'Test Session', 10, 99.99]);
        
        console.log('[Verification] ✓ INSERT operation successful');
        
        dbManager.run('DELETE FROM session_types WHERE id = ?', [testId]);
        console.log('[Verification] ✓ DELETE operation successful');
    } catch (err) {
        console.error('[Verification] ✗ Table operations failed:', err.message);
        process.exit(1);
    }

    console.log('\n[Verification] ✓ All checks passed! Table is ready to use.');
    console.log('[Verification] If you still see errors, restart your server.');
    process.exit(0);
} catch (error) {
    console.error('[Verification] FATAL ERROR:', error);
    process.exit(1);
}

