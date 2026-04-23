const sqlite3 = require("better-sqlite3");
const path = require("path");

const DB_FILE = "E:\\ClickFlash\\apps\\management\\backend\\data\\management.db";

async function check() {
    console.log(`Checking Hub Database Schema: ${DB_FILE}`);
    const db = new sqlite3(DB_FILE);

    console.log("--- TABLE INFO: orders ---");
    const ordersInfo = db.prepare("PRAGMA table_info(orders)").all();
    console.log(JSON.stringify(ordersInfo, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
