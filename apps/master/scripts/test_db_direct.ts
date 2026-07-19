
import { DatabaseManager } from '../backend/database/db';
import path from 'path';
import { logger } from '@/utils/logger';

const DATA_DIR = path.join(process.cwd(), 'pb_data');
const DB_FILE = path.join(DATA_DIR, 'master.db');

async function testDirectDB() {
    logger.info('Testing Direct DB operations on:', DB_FILE);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    // 1. Create
    const id = 'test-manual-' + Date.now();
    logger.info('Creating ID:', id);
    db.run("INSERT INTO kiosks (id, name, status) VALUES (?, ?, ?)", [id, 'Manual Test', 'Disconnected']);

    // 2. Verify Creation
    let record = db.get("SELECT * FROM kiosks WHERE id = ?", [id]);
    logger.info('Created Record:', record);

    // 3. Update Transaction
    logger.info('Starting Transaction...');
    db.transaction(() => {
        const sql = "UPDATE kiosks SET ordersFolderPath = ? WHERE id = ?";
        const path = "C:\\Direct\\DB\\Test";
        logger.info(`Executing: ${sql} with [${path}, ${id}]`);
        const info = db.run(sql, [path, id]);
        logger.info('Update Changes:', info.changes);

        // Verify inside transaction
        const inside = db.get("SELECT * FROM kiosks WHERE id = ?", [id]);
        logger.info('Inside Transaction Path:', inside.ordersFolderPath);
    });
    logger.info('Transaction Committed.');

    // 4. Verify Persistence
    record = db.get("SELECT * FROM kiosks WHERE id = ?", [id]);
    logger.info('Final Record Path:', record.ordersFolderPath);

    if (record.ordersFolderPath === "C:\\Direct\\DB\\Test") {
        logger.info('SUCCESS: DB persistence works.');
    } else {
        logger.error('FAILURE: DB persistence broken.');
    }
}

testDirectDB();
