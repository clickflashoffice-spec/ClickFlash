const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "pb_data", "master.db");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

try {
  // Ensure settings table exists (it should, but safety first)
  db.prepare(
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`,
  ).run();

  // Set desk_id to TEST_MASTER
  db.prepare(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('desk_id', 'TEST_MASTER')`,
  ).run();
  console.log("Successfully set desk_id to TEST_MASTER in DB");

  // Set cloud_url if not already set (fallback to hub)
  db.prepare(
    `INSERT OR IGNORE INTO settings (key, value) VALUES ('cloud_url', 'https://management-hub.clickflash-office.workers.dev')`,
  ).run();

  // Check results
  const row = db
    .prepare("SELECT value FROM settings WHERE key = 'desk_id'")
    .get();
  console.log("Verified Desk ID in DB:", row.value);
} catch (e) {
  console.error("Error updating DB:", e.message);
} finally {
  db.close();
}
