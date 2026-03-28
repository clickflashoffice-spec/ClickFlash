
import fs from 'fs';
import path from 'path';
const Database = require('better-sqlite3-multiple-ciphers');
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'pb_data/uploads';
const dbPath = process.env.DB_PATH || 'pb_data/master.db';

async function runDeepAudit() {
    console.log('\n==========================================');
    console.log('🚀 MASTER IMPORT SYSTEM DEEP AUDIT V3');
    console.log('==========================================\n');

    if (!fs.existsSync(dbPath)) {
        console.error(`❌ DB not found at: ${dbPath}`);
        return;
    }

    const db = new Database(dbPath, { readonly: true });

    try {
        // 1. ENGINE CLINIC
        console.log('[1/4] SQLite Engine Diagnostics...');
        const journal = db.pragma('journal_mode');
        const busyTimeout = db.pragma('busy_timeout');
        const synchronous = db.pragma('synchronous');
        const integrity = db.pragma('integrity_check');
        const pageCount = db.pragma('page_count');
        const freelistCount = db.pragma('freelist_count');
        const pageSize = db.pragma('page_size');

        console.log(`- Journal Mode: ${journal}`);
        console.log(`- Synchronous: ${synchronous} (2nd: NORMAL, 3rd: FULL)`);
        console.log(`- Busy Timeout: ${busyTimeout}ms`);
        console.log(`- Integrity Check: ${integrity}`);
        console.log(`- DB Size: ${((pageCount * pageSize) / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`- Fragmentation: ${((freelistCount / pageCount) * 100).toFixed(2)}%`);

        // 2. INDEX UTILIZATION AUDIT
        console.log('\n[2/4] Query Plan Analysis...');
        const plan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM photos WHERE albumId = ?').all('dummy_id');
        console.log('- Plan for albumId lookup:', JSON.stringify(plan, null, 2));

        const hasIndex = JSON.stringify(plan).includes('USING INDEX');
        if (hasIndex) {
            console.log('✅ albumId is successfully indexed.');
        } else {
            console.warn('⚠️ WARNING: albumId is NOT indexed! Large albums will slow down.');
        }

        // 3. STORAGE SYNC AUDIT (Law 12 & 15)
        console.log('\n[3/4] Physical Asset Sweep...');
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN fileSize = 0 THEN 1 END) as zeroByte,
                COUNT(CASE WHEN fileHash IS NULL THEN 1 END) as missingHash
            FROM photos
        `).get();

        console.log(`- Total DB Records: ${stats.total}`);
        console.log(`- Zero-Byte Records: ${stats.zeroByte}`);
        console.log(`- Missing Hashes: ${stats.missingHash}`);

        const largestAlbum = db.prepare(`
            SELECT albumId, COUNT(*) as count 
            FROM photos 
            GROUP BY albumId 
            ORDER BY count DESC 
            LIMIT 1
        `).get();

        if (largestAlbum) {
            console.log(`- Analyzing Largest Album: ${largestAlbum.albumId} (${largestAlbum.count} photos)`);
            const samplePhotos = db.prepare('SELECT url FROM photos WHERE albumId = ? LIMIT 100').all(largestAlbum.albumId);
            let missingFiles = 0;
            for (const p of samplePhotos) {
                if (!fs.existsSync(path.resolve(UPLOAD_DIR, p.url))) {
                    missingFiles++;
                }
            }
            console.log(`  - Sample Integrity (Top 100): ${100 - missingFiles}% healthy.`);
        }

        // 4. RESOURCE TRENDS
        console.log('\n[4/4] Load Baseline...');
        const mem = process.memoryUsage();
        console.log(`- Memory RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
        console.log(`- Memory Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);

    } catch (e: any) {
        console.error('❌ Audit Error:', e.message);
    } finally {
        db.close();
        console.log('\n==========================================');
        console.log('✅ Deep Audit Complete.');
        console.log('==========================================\n');
    }
}

runDeepAudit();
