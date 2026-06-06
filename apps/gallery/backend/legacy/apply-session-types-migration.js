// backend/apply-session-types-migration.js
// Utility script to manually apply the session_types table migration

const DatabaseManager = require('./db');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

async function applySessionTypesMigration() {
    console.log('[Session Types Migration] Starting migration...');
    console.log(`[Session Types Migration] Database: ${DB_FILE}`);

    if (!require('fs').existsSync(DB_FILE)) {
        console.error(`[Session Types Migration] ERROR: Database file not found: ${DB_FILE}`);
        console.error(`[Session Types Migration] Please ensure the server has been started at least once.`);
        process.exit(1);
    }

    try {
        const dbManager = new DatabaseManager(DB_FILE);
        dbManager.connect();

        // Check if table already exists
        const tableExists = dbManager.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='session_types'
        `);

        if (tableExists) {
            console.log('[Session Types Migration] ✓ session_types table already exists');
            
            // Check if migration record exists
            const migrationRecord = dbManager.get(`
                SELECT name FROM migrations WHERE name = '004_add_session_types.sql'
            `);
            
            if (migrationRecord) {
                console.log('[Session Types Migration] ✓ Migration already recorded in migrations table');
            } else {
                console.log('[Session Types Migration] ⚠️  Table exists but migration not recorded. Adding migration record...');
                dbManager.run('INSERT INTO migrations (name) VALUES (?)', ['004_add_session_types.sql']);
                console.log('[Session Types Migration] ✓ Migration record added');
            }
        } else {
            console.log('[Session Types Migration] Applying migration: 004_add_session_types.sql');
            
            const fs = require('fs');
            const migrationPath = path.join(__dirname, 'migrations', '004_add_session_types.sql');
            const sql = fs.readFileSync(migrationPath, 'utf8');
            
            // Use the same pattern as runMigrations
            dbManager.db.transaction(() => {
                dbManager.db.exec(sql);
                dbManager.run('INSERT INTO migrations (name) VALUES (?)', ['004_add_session_types.sql']);
            })();
            
            console.log('[Session Types Migration] ✓ Migration applied successfully!');
        }

        // Verify the table structure
        const tableInfo = dbManager.query('PRAGMA table_info(session_types)');
        console.log('\n[Session Types Migration] Table structure:');
        tableInfo.forEach(col => {
            console.log(`  - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
        });

        console.log('\n[Session Types Migration] ✓ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('[Session Types Migration] FATAL ERROR:', error);
        process.exit(1);
    }
}

// Run migration
applySessionTypesMigration().catch(error => {
    console.error('[Session Types Migration] Unhandled error:', error);
    process.exit(1);
});

