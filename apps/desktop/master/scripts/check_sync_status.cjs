const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "pb_data", "master.db");
const db = new Database(dbPath);

try {
  const rows = db
    .prepare(
      "SELECT id, status, cloud_sync_status, cloud_sync_error FROM orders WHERE id = 'b8dacf3e-1d4d-4ec6-9b46-dfec2fa0ee55'",
    )
    .all();
  console.log(JSON.stringify(rows, null, 2));

  const allPending = db
    .prepare(
      "SELECT id, status, cloud_sync_status FROM orders WHERE cloud_sync_status != 'synced'",
    )
    .all();
  console.log("Other non-synced orders:", allPending.length);
} catch (e) {
  console.error("Error:", e.message);
} finally {
  db.close();
}
