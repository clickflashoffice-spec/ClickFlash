const Database = require("better-sqlite3");
const path = require("path");
const crypto = require("crypto");

const dbPath = path.join(__dirname, "..", "pb_data", "master.db");
const db = new Database(dbPath);

try {
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const testOrder = {
    id: orderId,
    date: now,
    clientName: "Test Customer",
    email: "test_customer@example.com",
    customerEmail: "test_customer@example.com",
    status: "paid",
    total: 25.0,
    items: JSON.stringify([
      {
        id: "item_1",
        name: "Photo Print 4x6",
        price: 10.0,
        quantity: 1,
        photoId: "photo_test_001",
      },
      {
        id: "item_2",
        name: "Digital High-Res",
        price: 15.0,
        quantity: 1,
        photoId: "photo_test_002",
      },
    ]),
    albumId: "test_album_001",
    photographerId: 1,
    sync_status: "pending",
    cloud_sync_status: "pending",
    created_at: now,
    updated_at: now,
  };

  const stmt = db.prepare(`
        INSERT INTO orders (
            id, date, clientName, email, customerEmail, status, total, items, 
            albumId, photographerId, sync_status, cloud_sync_status, created_at, updated_at
        ) VALUES (
            @id, @date, @clientName, @email, @customerEmail, @status, @total, @items, 
            @albumId, @photographerId, @sync_status, @cloud_sync_status, @created_at, @updated_at
        )
    `);

  stmt.run(testOrder);
  console.log("Successfully created test order:", orderId);

  // Also check if CloudSync will find it
  const pending = db
    .prepare("SELECT id FROM orders WHERE cloud_sync_status = 'pending'")
    .all();
  console.log(`Current pending cloud sync orders: ${pending.length}`);
} catch (e) {
  console.error("Error creating test order:", e.message);
} finally {
  db.close();
}
