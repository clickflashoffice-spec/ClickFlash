/**
 * Check Destinations Table Script
 * Utility script to verify if the destinations table exists and display its structure
 * 
 * Usage: node backend/check-destinations-table.js [data_dir]
 * 
 * @module check-destinations-table
 */

const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = process.argv[2] || process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

try {
    const db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    
    // Check if table exists
    const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='destinations'").get();
    
    if (tableInfo) {
        console.log('✅ Destinations table exists');
        
        // Check table structure
        const columns = db.prepare("PRAGMA table_info(destinations)").all();
        console.log('\nTable structure:');
        columns.forEach(col => {
            console.log(`  - ${col.name} (${col.type})`);
        });
        
        // Count records
        const count = db.prepare("SELECT COUNT(*) as count FROM destinations").get();
        console.log(`\nRecords in table: ${count.count}`);
    } else {
        console.log('❌ Destinations table does NOT exist');
        console.log('\nTo fix:');
        console.log('1. Restart the backend server');
        console.log('2. The migration should run automatically');
        console.log('3. Or manually run: node backend/db.js');
    }
    
    db.close();
} catch (error) {
    console.error('Error checking database:', error.message);
    process.exit(1);
}

