
import { DatabaseManager } from '../backend/shared/db';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'pb_data');
const DB_FILE = path.join(DATA_DIR, 'master.db');

async function checkSchema() {
    console.log('Checking database:', DB_FILE);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    try {
        const columns = db.query("PRAGMA table_info(kiosks)");
        console.log('Columns in kiosks table:', columns.map((c: any) => c.name));

        const hasUpload = columns.some((c: any) => c.name === 'uploadFolderPath');
        const hasOrders = columns.some((c: any) => c.name === 'ordersFolderPath');

        console.log('Has uploadFolderPath:', hasUpload);
        console.log('Has ordersFolderPath:', hasOrders);

    } catch (e) {
        console.error('Error:', e);
    }
}

checkSchema();
