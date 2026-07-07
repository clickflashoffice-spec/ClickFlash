const sqlite3 = require("better-sqlite3");
const path = require("path");

const DB_FILE = "E:\\ClickFlash\\apps\\management\\pb_data\\data.db";

async function check() {
    console.log(`Listing Tables in: ${DB_FILE}`);
    const db = new sqlite3(DB_FILE);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(JSON.stringify(tables, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
