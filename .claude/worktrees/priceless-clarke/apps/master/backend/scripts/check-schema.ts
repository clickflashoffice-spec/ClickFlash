import { DatabaseManager } from "../shared/db";
import path from "path";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function check() {
    console.log(`Connecting to: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    console.log("--- TABLE INFO: orders ---");
    const ordersInfo = db.query("PRAGMA table_info(orders)");
    console.log(JSON.stringify(ordersInfo, null, 2));

    console.log("\n--- TABLE INFO: photos ---");
    const photosInfo = db.query("PRAGMA table_info(photos)");
    console.log(JSON.stringify(photosInfo, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
