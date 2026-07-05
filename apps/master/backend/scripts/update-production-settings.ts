import { DatabaseManager } from '../database/db';
import path from "path";

import { logger } from "../utils/logger";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function updateSettings() {
    logger.info(`Updating Master Settings in: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    const updates = [
        { key: 'cloud_url', value: 'https://management-hub.clickflash-office.workers.dev' },
        { key: 'cloud_email', value: 'admin@test.clickflash.photo' },
        { key: 'cloud_password', value: 'test_secure_password' },
        { key: 'desk_id', value: 'TN001' }
    ];

    for (const { key, value } of updates) {
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
        logger.info(`- Updated ${key} to ${value}`);
    }
    
    process.exit(0);
}

updateSettings().catch(err => {
    logger.error(err);
    process.exit(1);
});
