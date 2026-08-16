import Database from "better-sqlite3";

const db = new Database("pb_data/touch.db", { fileMustExist: false });

try {
  // Try inserting an album directly for tests
  console.log("Seeding touch.db...");

  // Use PocketBase schema compliant columns
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT,
      roomNumber TEXT,
      date TEXT,
      status TEXT,
      source TEXT,
      kiosk_ready INTEGER DEFAULT 0,
      coverPhotoUrl TEXT,
      created TEXT DEFAULT CURRENT_TIMESTAMP,
      updated TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `
  ).run();

  // Insert mock album for room 101
  db.prepare("DELETE FROM albums WHERE roomNumber = '101'").run();
  db.prepare(
    "INSERT INTO albums (id, title, roomNumber, kiosk_ready, date, status, source) VALUES ('album123', 'Sunset Couples', '101', 1, '2025-10-24', 'Finalized', '100_NIKON')"
  ).run();

  // Try creating photos table
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      title TEXT,
      url TEXT,
      albumId TEXT,
      created TEXT DEFAULT CURRENT_TIMESTAMP,
      updated TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `
  ).run();

  // Insert mock photos for the album
  db.prepare("DELETE FROM photos WHERE albumId = 'album123'").run();
  db.prepare(
    "INSERT INTO photos (id, title, url, albumId) VALUES ('p1', 'Photo 1', 'https://imgur.com/example1.jpg', 'album123')"
  ).run();
  db.prepare(
    "INSERT INTO photos (id, title, url, albumId) VALUES ('p2', 'Photo 2', 'https://imgur.com/example2.jpg', 'album123')"
  ).run();

  console.log("Seeding complete. Touch.db updated.");
} catch (e: unknown) {
  console.error("Seeding failed:", e);
} finally {
  db.close();
}
