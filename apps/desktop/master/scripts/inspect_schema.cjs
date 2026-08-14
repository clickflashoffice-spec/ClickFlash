const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "pb_data", "master.db");
const db = new Database(dbPath);

try {
  const info = db.prepare("PRAGMA table_info(orders)").all();
  console.log(JSON.stringify(info, null, 2));
} catch (e) {
  console.error("Error:", e.message);
} finally {
  db.close();
}
