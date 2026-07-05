
import { DatabaseManager } from '../backend/database/db';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'pb_data');
const DB_FILE = path.join(DATA_DIR, 'master.db');

async function testDirectDB() {
    console.log('Testing Direct DB operations on:', DB_FILE);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    // 1. Create
    const id = 'test-manual-' + Date.now();
    console.log('Creating ID:', id);
    db.run("INSERT INTO kiosks (id, name, status) VALUES (?, ?, ?)", [id, 'Manual Test', 'Disconnected']);

    // 2. Verify Creation
    let record = db.get("SELECT * FROM kiosks WHERE id = ?", [id]);
    console.log('Created Record:', record);

    // 3. Update Transaction
    console.log('Starting Transaction...');
    db.transaction(() => {
        const sql = "UPDATE kiosks SET ordersFolderPath = ? WHERE id = ?";
        const path = "C:\\Direct\\DB\\Test";
        console.log(`Executing: ${sql} with [${path}, ${id}]`);
        const info = db.run(sql, [path, id]);
        console.log('Update Changes:', info.changes);

        // Verify inside transaction
        const inside = db.get("SELECT * FROM kiosks WHERE id = ?", [id]);
        console.log('Inside Transaction Path:', inside.ordersFolderPath);
    });
    console.log('Transaction Committed.');

    // 4. Verify Persistence
    record = db.get("SELECT * FROM kiosks WHERE id = ?", [id]);
    console.log('Final Record Path:', record.ordersFolderPath);

    if (record.ordersFolderPath === "C:\\Direct\\DB\\Test") {
        console.log('SUCCESS: DB persistence works.');
    } else {
        console.error('FAILURE: DB persistence broken.');
    }
}

testDirectDB();
