const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "pb_data", "master.db");
const db = new Database(dbPath);

try {
  const result = db
    .prepare(
      "UPDATE orders SET cloud_sync_status = 'pending', cloud_sync_error = NULL WHERE id = 'b8dacf3e-1d4d-4ec6-9b46-dfec2fa0ee55'",
    )
    .run();
  console.log(`Updated ${result.changes} order(s).`);
} catch (e) {
  console.error("Error reset order:", e.message);
} finally {
  db.close();
}
