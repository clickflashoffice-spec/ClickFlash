import { DatabaseManager } from "../shared/db";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

async function seed() {
    console.log("--- Seeding Master Test Data (Path Fixed) ---");
    console.log(`Using Database: ${DB_FILE}`);
    
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const db = new DatabaseManager(DB_FILE);
    db.connect();

    // 1. Ensure test photographer
    const photographerId = 999;
    const photographer = db.get("SELECT id FROM users WHERE id = ?", [photographerId]);
    if (!photographer) {
        db.run(`
            INSERT INTO users (id, name, email, role, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [photographerId, "Test Photographer", "test@photographer.com", "Photographer"]);
        console.log("Created test photographer");
    }

    // 2. Create test album
    const albumTimestamp = Date.now();
    const albumId = "TEST_ALBUM_" + albumTimestamp;
    db.run(`
        INSERT INTO albums (id, title, date, photographerId, status, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [albumId, "Cloud Test Album", new Date().toISOString(), photographerId, "Published"]);
    console.log(`Created test album: ${albumId}`);

    // 3. Create album directory
    const albumUploadDir = path.join(UPLOAD_DIR, albumId);
    if (!fs.existsSync(albumUploadDir)) fs.mkdirSync(albumUploadDir, { recursive: true });

    // 4. Create test photos
    const photoIds = ["P1", "P2"];
    for (const p of photoIds) {
        const photoId = `${albumId}_${p}`;
        const fileName = `${photoId}.jpg`;
        const filePath = path.join(albumUploadDir, fileName);
        
        // Create dummy JPG file
        fs.writeFileSync(filePath, Buffer.from("dummy-photo-content"));
        
        // Also create thumb/preview candidate files as expected by uploadRetentionAsset
        fs.writeFileSync(path.join(albumUploadDir, `${photoId}_preview_wm.webp`), Buffer.from("dummy-preview"));
        fs.writeFileSync(path.join(albumUploadDir, `${photoId}_tiny.webp`), Buffer.from("dummy-tiny"));

        db.run(`
            INSERT INTO photos (id, albumId, title, url, photographerId, created_at, storagePath)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `, [photoId, albumId, `Test Photo ${p}`, fileName, photographerId, path.join(albumId, fileName)]);
    }
    console.log(`Created ${photoIds.length} test photos`);

    // 5. Create test order
    const orderId = "TEST_ORDER_" + albumTimestamp;
    const orderNumber = "ORD-" + albumTimestamp;
    const items = photoIds.map(p => ({
        id: `${albumId}_${p}`,
        type: "photo",
        price: 10
    }));

    db.run(`
        INSERT INTO orders (id, orderNumber, date, clientName, email, status, total, photographerId, items, albumId, created_at, cloud_sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `, [
        orderId, 
        orderNumber,
        new Date().toISOString(), 
        "Test Client", 
        "client@test.com", 
        "paid", 
        20, 
        photographerId, 
        JSON.stringify(items),
        albumId,
        'pending'
    ]);
    
    console.log(`Created test order: ${orderId} (${orderNumber})`);
    console.log("--- Seeding Complete ---");
    process.exit(0);
}

seed().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
