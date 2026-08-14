import { DatabaseManager } from '../database/db';
import path from "path";

import { logger } from "../utils/logger";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function check() {
    logger.info(`Checking Settings in: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    const settings = db.query("SELECT key, value FROM settings");
    logger.info(JSON.stringify(settings, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    logger.error(err);
    process.exit(1);
});
