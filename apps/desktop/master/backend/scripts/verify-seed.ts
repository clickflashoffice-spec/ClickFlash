import { DatabaseManager } from '../database/db';
import path from "path";

import { logger } from "../utils/logger";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function check() {
    logger.info(`Checking Master Database: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    const orders = db.query("SELECT id, orderNumber, status, cloud_sync_status FROM orders WHERE id LIKE 'TEST_ORDER_%'");
    logger.info(`Found ${orders.length} test orders`);
    if (orders.length > 0) {
        orders.forEach(o => {
            logger.info(`- Order: ${o.id} (${o.orderNumber}), Status: ${o.status}, Sync Status: ${o.cloud_sync_status}`);
        });
    }
    
    process.exit(0);
}

check().catch(err => {
    logger.error(err);
    process.exit(1);
});
