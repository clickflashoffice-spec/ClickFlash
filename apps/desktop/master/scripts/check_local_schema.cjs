const Database = require("better-sqlite3");
const path = require("path");

const dbPath = "e:/ClickFlash/apps/master/pb_data/master.db";
const db = new Database(dbPath);

const info = db.prepare("PRAGMA table_info(orders)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
