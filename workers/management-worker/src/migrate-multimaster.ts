import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DATA_DIR || path.join(__dirname, '../../pb_data');
const dbPath = path.join(dbDir, 'data.db');
const migrationPath = path.join(__dirname, '../migrations/011_multimaster_compatibility.sql');

console.log(`Applying TS migration to: ${dbPath}`);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(sql);
    console.log('✅ MultiMaster Compatibility Migration applied successfully.');
} catch (err: any) {
    if (err.message.includes('duplicate column name')) {
        console.log('ℹ️ Columns already exist.');
    } else {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
} finally {
    db.close();
}
