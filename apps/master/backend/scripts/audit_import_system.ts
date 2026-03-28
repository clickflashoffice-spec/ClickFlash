import fs from 'fs';
import path from 'path';
const Database = require('better-sqlite3-multiple-ciphers');
import dotenv from 'dotenv';

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'pb_data/uploads';
const dbPath = process.env.DB_PATH || 'pb_data/master.db';

// Targeted IDs from logs
const TARGET_ALBUM_IDS = ['afc98142-2fc3-44d8-af4b-49bc6b8c88dc', '00926842-06c6-495c-8a68-d4f4f4d12117'];

async function runAudit() {
    console.log('🚀 Starting Master Import System Audit (Deep Scan)...');
    console.log('------------------------------------------');

    if (!fs.existsSync(dbPath)) {
        console.error(`❌ DB not found at: ${dbPath}`);
        return;
    }

    let db;
    try {
        db = new Database(dbPath);

        console.log('\n[1/5] Checking Targeted Albums...');
        for (const id of TARGET_ALBUM_IDS) {
            const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
            if (album) {
                console.log(`✅ Album Found: ${id} (${album.title})`);
                const photoCount = db.prepare('SELECT count(*) as count FROM photos WHERE albumId = ?').get(id);
                console.log(`   - Associated Photos: ${photoCount.count}`);
            } else {
                console.error(`❌ Album MISSING: ${id}`);
                // Check if any photos reference this missing album
                const orphanCount = db.prepare('SELECT count(*) as count FROM photos WHERE albumId = ?').get(id);
                if (orphanCount.count > 0) {
                    console.error(`   - ⚠️ FOUND ${orphanCount.count} orphaned photos referencing this missing ID!`);
                }
            }
        }

        // 2. Data Integrity Audit
        console.log('\n[2/5] System Wide Stats...');
        const totalPhotos = db.prepare('SELECT count(*) as count FROM photos').get() as any;
        const totalAlbums = db.prepare('SELECT count(*) as count FROM albums').get() as any;
        console.log(`- Total Albums: ${totalAlbums?.count || 0}`);
        console.log(`- Total Photos: ${totalPhotos?.count || 0}`);

        const orphanedPhotos = db.prepare('SELECT count(*) as count FROM photos WHERE albumId NOT IN (SELECT id FROM albums)').get() as any;
        console.log(`- Total Orphaned Photos: ${orphanedPhotos?.count || 0}`);

        // 3. Filesystem Sync Audit
        console.log('\n[3/5] Checking Filesystem Health...');
        const photos = db.prepare('SELECT id, url, albumId FROM photos LIMIT 500').all() as any[];
        let deadLinks = 0;

        for (const photo of photos) {
            const fullPath = path.resolve(UPLOAD_DIR, photo.url);
            if (!fs.existsSync(fullPath)) deadLinks++;
        }
        console.log(`- Sample Check (up to 500): ${deadLinks} dead high-res links.`);

        // 4. Room Number Propagation
        console.log('\n[4/5] Room Number Coverage...');
        try {
            const row = db.prepare('SELECT count(*) as count FROM photos WHERE roomNumber IS NOT NULL AND roomNumber != ""').get() as any;
            console.log(`- Photos with Room Number: ${row.count}/${totalPhotos.count}`);
        } catch (e) {
            console.warn('⚠️ roomNumber column missing in photos table.');
        }

        // 5. Processing Dir Check
        console.log('\n[5/5] Processing Directory... (EBUSY Risk Check)');
        const procDir = path.join(path.dirname(dbPath), 'processing');
        if (fs.existsSync(procDir)) {
            const files = fs.readdirSync(procDir);
            console.log(`- Files in processing/: ${files.length}`);
            if (files.length > 50) {
                console.warn('⚠️ WARNING: Large number of files in processing/ suggesting failed renames.');
            }
        }

    } catch (error: any) {
        console.error('Audit failed:', error.message);
    } finally {
        if (db) db.close();
        console.log('\n------------------------------------------');
        console.log('✅ Audit Session Complete.');
    }
}

runAudit();
