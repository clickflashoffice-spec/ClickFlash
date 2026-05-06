
import Database from 'better-sqlite3-multiple-ciphers';

const dbPath = 'E:/ClickFlash/master-app/react-new-backup/pb_data/master.db';

try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    console.log('--- DATABASE SCHEMA AUDIT ---');
    for (const table of tables as any) {
        console.log(`\nTable: ${table.name}`);
        const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`).get() as any;
        console.log(schema.sql);
        
        const indexes = db.prepare(`SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='${table.name}'`).all();
        if (indexes.length > 0) {
            console.log('Indexes:');
            indexes.forEach((idx: any) => {
                if (idx.sql) console.log(`  ${idx.sql}`);
            });
        }
    }
} catch (err) {
    console.error('Error reading schema:', err);
}
