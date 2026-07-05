import { DatabaseManager } from "../backend/database/db";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = "E:\\ClickFlash\\apps\\master\\pb_data";
const DB_FILE = path.join(DATA_DIR, "master.db");
const UPLOAD_DIR = "E:\\ClickFlash\\apps\\master\\uploads";

const TARGET_PHOTOS = 100000;
const ALBUMS_COUNT = 50;

async function generateStressData() {
    console.log(`🚀 Generating Stress Data (${TARGET_PHOTOS} photos)...`);

    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect();

    // 1. Create Albums
    console.log(`Creating ${ALBUMS_COUNT} albums...`);
    const albumIds: string[] = [];
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    dbManager.transaction(() => {
        for (let i = 0; i < ALBUMS_COUNT; i++) {
            const id = crypto.randomUUID();
            const title = `Stress Test Album ${i + 1}`;
            dbManager.run(`
                INSERT OR IGNORE INTO albums (id, title, date, status, created_at, updated_at)
                VALUES (?, ?, ?, 'active', ?, ?)
            `, [id, title, today, now, now]);
            albumIds.push(id);
            
            // Ensure directory exists
            const albumDir = path.join(UPLOAD_DIR, id);
            if (!fs.existsSync(albumDir)) fs.mkdirSync(albumDir, { recursive: true });
        }
    });

    // 2. Batch Insert Photos
    console.log(`Inserting ${TARGET_PHOTOS} photo records...`);
    const startTime = Date.now();
    
    dbManager.transaction(() => {
        const stmt = dbManager.prepare(`
            INSERT INTO photos (
                id, albumId, title, url, status, 
                created_at, updated_at, photographerId, 
                sync_status, fileSize, mimeType
            )
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 'pending', 5000000, 'image/jpeg')
        `);

        for (let i = 0; i < TARGET_PHOTOS; i++) {
            const id = crypto.randomUUID();
            const albumId = albumIds[i % ALBUMS_COUNT];
            const title = `stress_test_${i}.jpg`;
            const url = `/${albumId}/${title}`;
            
            stmt.run(id, albumId, title, url, now, now, 1); // Assuming photographerId 1 exists

            if (i > 0 && i % 20000 === 0) {
                console.log(`  Processed ${i} photos...`);
            }
        }
    });

    const endTime = Date.now();
    console.log(`✅ Seeding complete in ${(endTime - startTime) / 1000}s`);

    // 3. Performance Benchmark (Simple query)
    console.log("\n📊 Running Performance Benchmarks...");
    
    const startQuery = Date.now();
    const count = dbManager.get<{ count: number }>("SELECT COUNT(*) as count FROM photos");
    console.log(`- Total Photos: ${count?.count}`);
    console.log(`- Count Query Time: ${Date.now() - startQuery}ms`);

    const startAlbum = Date.now();
    const albumId = albumIds[0];
    dbManager.query("SELECT * FROM photos WHERE albumId = ? LIMIT 100", [albumId]);
    console.log(`- Fetch 100 Photos from Album Time: ${Date.now() - startAlbum}ms`);

    dbManager.close();
    console.log("\n✨ Stress Test Data Generation Complete.");
}

generateStressData().catch(err => {
    console.error("Stress test generation failed:", err);
    process.exit(1);
});
