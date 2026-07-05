
import fs from 'fs';
const Database = require('better-sqlite3-multiple-ciphers');
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const dbPath = process.env.DB_PATH || 'pb_data/master.db';

async function runAudit() {
    logger.info('🔍 [Audit V2] Starting 360° System Audit...');
    logger.info('==========================================');

    if (!fs.existsSync(dbPath)) {
        logger.error(`❌ ERROR: Database not found at ${dbPath}`);
        return;
    }

    const db = new Database(dbPath);

    try {
        // 1. Pragmas Check
        logger.info('\n[1/4] SQLite Configuration Audit:');
        const journalMode = db.pragma('journal_mode')[0].journal_mode;
        const synchronous = db.pragma('synchronous')[0].synchronous;
        const busyTimeout = db.pragma('busy_timeout')[0].timeout;
        const foreignKeys = db.pragma('foreign_keys')[0].foreign_keys;

        logger.info(`- Journal Mode: ${journalMode} ${journalMode === 'wal' ? '✅' : '⚠️ (Should be WAL)'}`);
        logger.info(`- Synchronous: ${synchronous} (0=OFF, 1=NORMAL, 2=FULL)`);
        logger.info(`- Busy Timeout: ${busyTimeout}ms ${busyTimeout >= 5000 ? '✅' : '⚠️ (Should be >= 5000)'}`);
        logger.info(`- Foreign Keys: ${foreignKeys === 1 ? 'ON ✅' : 'OFF ⚠️'}`);

        // 2. Data Integrity Audit
        logger.info('\n[2/4] Data Integrity Audit:');
        const orphans = db.prepare(`
            SELECT id, albumId, originalFilename 
            FROM photos 
            WHERE albumId NOT IN (SELECT id FROM albums)
        `).all();

        if (orphans.length > 0) {
            logger.error(`❌ FOUND ${orphans.length} ORPHANED PHOTOS (Missing Album IDs):`);
            orphans.slice(0, 5).forEach((o: any) => logger.info(`   - Photo ${o.id}: References Album ${o.albumId} (${o.originalFilename})`));
            if (orphans.length > 5) logger.info(`   ... and ${orphans.length - 5} more.`);
        } else {
            logger.info('✅ No orphaned photos found.');
        }

        const invalidPhotographers = db.prepare(`
            SELECT id, photographerId, 'albums' as source FROM albums WHERE photographerId != '0' AND photographerId NOT IN (SELECT id FROM users)
            UNION
            SELECT id, photographerId, 'photos' as source FROM photos WHERE photographerId != '0' AND photographerId NOT IN (SELECT id FROM users)
        `).all();

        if (invalidPhotographers.length > 0) {
            logger.error(`❌ FOUND ${invalidPhotographers.length} INVALID PHOTOGRAPHER REFERENCES:`);
            invalidPhotographers.slice(0, 5).forEach((p: any) => logger.info(`   - ${p.source} ${p.id}: References User ${p.photographerId}`));
        } else {
            logger.info('✅ All photographer references are valid.');
        }

        // 3. ID Consistency Check
        logger.info('\n[3/4] ID Consistency Audit:');
        const idSamples = db.prepare('SELECT id FROM albums LIMIT 100').all();
        const nonUuid = idSamples.filter((a: any) => typeof a.id === 'string' && a.id.length < 32);
        if (nonUuid.length > 0) {
            logger.info(`ℹ️ Info: Found ${nonUuid.length} non-UUID album IDs in sample. (Expected if legacy data exists).`);
        }

        // 4. Performance & Contention Audit
        logger.info('\n[4/4] Performance Audit:');
        const photoSize = fs.statSync(dbPath).size;
        logger.info(`- Database Size: ${(photoSize / (1024 * 1024)).toFixed(2)} MB`);

        const slowQueries = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM photos WHERE albumId = ?').all('sample');
        logger.info(`- Query Plan for Album Search: ${JSON.stringify(slowQueries)}`);
        if (JSON.stringify(slowQueries).includes('SCAN TABLE')) {
            logger.warn('⚠️ WARNING: Sequential Scan detected for Album Search. Missing Index on photos(albumId)?');
        } else {
            logger.info('✅ Index check passed.');
        }

    } catch (err: any) {
        logger.error('❌ Audit encountered an error:', err.message);
    } finally {
        db.close();
        logger.info('\n==========================================');
        logger.info('✅ Audit Complete.');
    }
}

runAudit();
