import fs from 'fs';
import path from 'path';
const Database = require('better-sqlite3-multiple-ciphers');
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'pb_data/uploads';
const dbPath = process.env.DB_PATH || 'pb_data/master.db';

// Targeted IDs from logs
const TARGET_ALBUM_IDS = ['afc98142-2fc3-44d8-af4b-49bc6b8c88dc', '00926842-06c6-495c-8a68-d4f4f4d12117'];

async function runAudit() {
    logger.info('🚀 Starting Master Import System Audit (Deep Scan)...');
    logger.info('------------------------------------------');

    if (!fs.existsSync(dbPath)) {
        logger.error(`❌ DB not found at: ${dbPath}`);
        return;
    }

    let db;
    try {
        db = new Database(dbPath);

        logger.info('\n[1/5] Checking Targeted Albums...');
        for (const id of TARGET_ALBUM_IDS) {
            const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
            if (album) {
                logger.info(`✅ Album Found: ${id} (${album.title})`);
                const photoCount = db.prepare('SELECT count(*) as count FROM photos WHERE albumId = ?').get(id);
                logger.info(`   - Associated Photos: ${photoCount.count}`);
            } else {
                logger.error(`❌ Album MISSING: ${id}`);
                // Check if any photos reference this missing album
                const orphanCount = db.prepare('SELECT count(*) as count FROM photos WHERE albumId = ?').get(id);
                if (orphanCount.count > 0) {
                    logger.error(`   - ⚠️ FOUND ${orphanCount.count} orphaned photos referencing this missing ID!`);
                }
            }
        }

        // 2. Data Integrity Audit
        logger.info('\n[2/5] System Wide Stats...');
        const totalPhotos = db.prepare('SELECT count(*) as count FROM photos').get() as any;
        const totalAlbums = db.prepare('SELECT count(*) as count FROM albums').get() as any;
        logger.info(`- Total Albums: ${totalAlbums?.count || 0}`);
        logger.info(`- Total Photos: ${totalPhotos?.count || 0}`);

        const orphanedPhotos = db.prepare('SELECT count(*) as count FROM photos WHERE albumId NOT IN (SELECT id FROM albums)').get() as any;
        logger.info(`- Total Orphaned Photos: ${orphanedPhotos?.count || 0}`);

        // 3. Filesystem Sync Audit
        logger.info('\n[3/5] Checking Filesystem Health...');
        const photos = db.prepare('SELECT id, url, albumId FROM photos LIMIT 500').all() as any[];
        let deadLinks = 0;

        for (const photo of photos) {
            const fullPath = path.resolve(UPLOAD_DIR, photo.url);
            if (!fs.existsSync(fullPath)) deadLinks++;
        }
        logger.info(`- Sample Check (up to 500): ${deadLinks} dead high-res links.`);

        // 4. Room Number Propagation
        logger.info('\n[4/5] Room Number Coverage...');
        try {
            const row = db.prepare('SELECT count(*) as count FROM photos WHERE roomNumber IS NOT NULL AND roomNumber != ""').get() as any;
            logger.info(`- Photos with Room Number: ${row.count}/${totalPhotos.count}`);
        } catch (e) {
            logger.warn('⚠️ roomNumber column missing in photos table.');
        }

        // 5. Processing Dir Check
        logger.info('\n[5/5] Processing Directory... (EBUSY Risk Check)');
        const procDir = path.join(path.dirname(dbPath), 'processing');
        if (fs.existsSync(procDir)) {
            const files = fs.readdirSync(procDir);
            logger.info(`- Files in processing/: ${files.length}`);
            if (files.length > 50) {
                logger.warn('⚠️ WARNING: Large number of files in processing/ suggesting failed renames.');
            }
        }

    } catch (error: any) {
        logger.error('Audit failed:', error.message);
    } finally {
        if (db) db.close();
        logger.info('\n------------------------------------------');
        logger.info('✅ Audit Session Complete.');
    }
}

runAudit();
