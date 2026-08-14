
import fs from 'fs';
import path from 'path';
const Database = require('better-sqlite3-multiple-ciphers');
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'pb_data/uploads';
const dbPath = process.env.DB_PATH || 'pb_data/master.db';

async function runDeepAudit() {
    logger.info('\n==========================================');
    logger.info('🚀 MASTER IMPORT SYSTEM DEEP AUDIT V3');
    logger.info('==========================================\n');

    if (!fs.existsSync(dbPath)) {
        logger.error(`❌ DB not found at: ${dbPath}`);
        return;
    }

    const db = new Database(dbPath, { readonly: true });

    try {
        // 1. ENGINE CLINIC
        logger.info('[1/4] SQLite Engine Diagnostics...');
        const journal = db.pragma('journal_mode');
        const busyTimeout = db.pragma('busy_timeout');
        const synchronous = db.pragma('synchronous');
        const integrity = db.pragma('integrity_check');
        const pageCount = db.pragma('page_count');
        const freelistCount = db.pragma('freelist_count');
        const pageSize = db.pragma('page_size');

        logger.info(`- Journal Mode: ${journal}`);
        logger.info(`- Synchronous: ${synchronous} (2nd: NORMAL, 3rd: FULL)`);
        logger.info(`- Busy Timeout: ${busyTimeout}ms`);
        logger.info(`- Integrity Check: ${integrity}`);
        logger.info(`- DB Size: ${((pageCount * pageSize) / (1024 * 1024)).toFixed(2)} MB`);
        logger.info(`- Fragmentation: ${((freelistCount / pageCount) * 100).toFixed(2)}%`);

        // 2. INDEX UTILIZATION AUDIT
        logger.info('\n[2/4] Query Plan Analysis...');
        const plan = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM photos WHERE albumId = ?').all('dummy_id');
        logger.info('- Plan for albumId lookup:', JSON.stringify(plan, null, 2));

        const hasIndex = JSON.stringify(plan).includes('USING INDEX');
        if (hasIndex) {
            logger.info('✅ albumId is successfully indexed.');
        } else {
            logger.warn('⚠️ WARNING: albumId is NOT indexed! Large albums will slow down.');
        }

        // 3. STORAGE SYNC AUDIT (Law 12 & 15)
        logger.info('\n[3/4] Physical Asset Sweep...');
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN fileSize = 0 THEN 1 END) as zeroByte,
                COUNT(CASE WHEN fileHash IS NULL THEN 1 END) as missingHash
            FROM photos
        `).get();

        logger.info(`- Total DB Records: ${stats.total}`);
        logger.info(`- Zero-Byte Records: ${stats.zeroByte}`);
        logger.info(`- Missing Hashes: ${stats.missingHash}`);

        const largestAlbum = db.prepare(`
            SELECT albumId, COUNT(*) as count 
            FROM photos 
            GROUP BY albumId 
            ORDER BY count DESC 
            LIMIT 1
        `).get();

        if (largestAlbum) {
            logger.info(`- Analyzing Largest Album: ${largestAlbum.albumId} (${largestAlbum.count} photos)`);
            const samplePhotos = db.prepare('SELECT url FROM photos WHERE albumId = ? LIMIT 100').all(largestAlbum.albumId);
            let missingFiles = 0;
            for (const p of samplePhotos) {
                if (!fs.existsSync(path.resolve(UPLOAD_DIR, p.url))) {
                    missingFiles++;
                }
            }
            logger.info(`  - Sample Integrity (Top 100): ${100 - missingFiles}% healthy.`);
        }

        // 4. RESOURCE TRENDS
        logger.info('\n[4/4] Load Baseline...');
        const mem = process.memoryUsage();
        logger.info(`- Memory RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
        logger.info(`- Memory Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} / ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);

    } catch (e: any) {
        logger.error('❌ Audit Error:', e.message);
    } finally {
        db.close();
        logger.info('\n==========================================');
        logger.info('✅ Deep Audit Complete.');
        logger.info('==========================================\n');
    }
}

runDeepAudit();
