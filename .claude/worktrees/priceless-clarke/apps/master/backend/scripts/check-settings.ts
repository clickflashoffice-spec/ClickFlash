import { DatabaseManager } from "../shared/db";
import path from "path";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");

async function check() {
    console.log(`Checking Settings in: ${DB_FILE}`);
    const db = new DatabaseManager(DB_FILE);
    db.connect();

    const settings = db.query("SELECT key, value FROM settings");
    console.log(JSON.stringify(settings, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
