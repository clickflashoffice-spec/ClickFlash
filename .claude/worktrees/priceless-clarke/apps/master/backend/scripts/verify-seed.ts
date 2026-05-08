import { DatabaseManager } from "../shared/db";
import path from "path";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function check() {
    console.log(`Checking Master Database: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    const orders = db.query("SELECT id, orderNumber, status, cloud_sync_status FROM orders WHERE id LIKE 'TEST_ORDER_%'");
    console.log(`Found ${orders.length} test orders`);
    if (orders.length > 0) {
        orders.forEach(o => {
            console.log(`- Order: ${o.id} (${o.orderNumber}), Status: ${o.status}, Sync Status: ${o.cloud_sync_status}`);
        });
    }
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
