const Database = require("better-sqlite3");
const path = require("path");

const dbPath = "e:/ClickFlash/apps/master/pb_data/master.db";
const db = new Database(dbPath);

const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
const columns = tableInfo.map((c) => c.name);

console.log("Existing columns:", columns);

const requiredColumns = [
  { name: "access_pin", type: "TEXT" },
  { name: "magic_link_token", type: "TEXT" },
  { name: "cloud_sync_status", type: 'TEXT DEFAULT "pending"' },
  { name: "cloud_sync_error", type: "TEXT" },
];

for (const col of requiredColumns) {
  if (!columns.includes(col.name)) {
    console.log(`Adding column ${col.name}...`);
    try {
      db.prepare(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`).run();
    } catch (e) {
      console.error(`Failed to add ${col.name}:`, e.message);
    }
  }
}

db.close();
console.log("Schema check complete.");
