import { DatabaseManager } from '../database/db';
import path from "path";

import { logger } from "../utils/logger";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function check() {
    logger.info(`Connecting to: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    logger.info("--- TABLE INFO: orders ---");
    const ordersInfo = db.query("PRAGMA table_info(orders)");
    logger.info(JSON.stringify(ordersInfo, null, 2));

    logger.info("\n--- TABLE INFO: photos ---");
    const photosInfo = db.query("PRAGMA table_info(photos)");
    logger.info(JSON.stringify(photosInfo, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    logger.error(err);
    process.exit(1);
});
