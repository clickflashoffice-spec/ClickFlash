/**
 * Seed the test database with real photos from the Phone Link folder.
 * Run from apps/master: npx tsx backend/scripts/seed-phone-link.ts
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const SOURCE_DIR = "C:/Users/alamo/Downloads/Phone Link";
const DATA_DIR = path.join(process.cwd(), "pb_data");
const DB_FILE = path.join(DATA_DIR, "master.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function seed() {
  console.log("--- Seeding Phone Link album ---");
  console.log(`DB: ${DB_FILE}`);

  if (!fs.existsSync(DB_FILE)) {
    console.error("DB not found — start the server once first to create it.");
    process.exit(1);
  }

  const db = new Database(DB_FILE);

  // Find admin user
  const admin = db.prepare("SELECT id FROM users WHERE role = 'Admin' LIMIT 1").get() as { id: number } | undefined;
  if (!admin) {
    console.error("No Admin user found — run the app once to seed the default user.");
    process.exit(1);
  }
  const photographerId = admin.id;
  console.log(`Using admin user id=${photographerId}`);

  // Check if album already exists
  const existing = db.prepare("SELECT id FROM albums WHERE title = 'Phone Link Test'").get();
  if (existing) {
    console.log("Album 'Phone Link Test' already exists — skipping.");
    process.exit(0);
  }

  // Create album
  const albumId = "PHONE_LINK_" + Date.now();
  db.prepare(`
    INSERT INTO albums (id, title, date, photographerId, status, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(albumId, "Phone Link Test", new Date().toISOString().split("T")[0], photographerId, "Published");
  console.log(`Created album: ${albumId}`);

  // Create upload dir for album
  const albumUploadDir = path.join(UPLOAD_DIR, albumId);
  fs.mkdirSync(albumUploadDir, { recursive: true });

  // Copy photos
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, 30); // limit to first 30 for speed

  console.log(`Copying ${files.length} photos...`);
  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, albumId, title, url, photographerId, created_at, storagePath)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `);

  let count = 0;
  for (const file of files) {
    const src = path.join(SOURCE_DIR, file);
    const destFile = file.replace(/[^a-zA-Z0-9._-]/g, "_");
    const dest = path.join(albumUploadDir, destFile);
    fs.copyFileSync(src, dest);

    const photoId = `${albumId}_${count}`;
    insertPhoto.run(photoId, albumId, destFile, destFile, photographerId, path.join(albumId, destFile));
    count++;
  }

  console.log(`Inserted ${count} photos.`);
  console.log("--- Done ---");
  db.close();
}

seed();
