
import fs from 'fs';
import path from 'path';
const Database = require('better-sqlite3-multiple-ciphers');
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || 'pb_data/master.db';

async function runAudit() {
    console.log('🔍 [Audit V2] Starting 360° System Audit...');
    console.log('==========================================');

    if (!fs.existsSync(dbPath)) {
        console.error(`❌ ERROR: Database not found at ${dbPath}`);
        return;
    }

    const db = new Database(dbPath);

    try {
        // 1. Pragmas Check
        console.log('\n[1/4] SQLite Configuration Audit:');
        const journalMode = db.pragma('journal_mode')[0].journal_mode;
        const synchronous = db.pragma('synchronous')[0].synchronous;
        const busyTimeout = db.pragma('busy_timeout')[0].timeout;
        const foreignKeys = db.pragma('foreign_keys')[0].foreign_keys;

        console.log(`- Journal Mode: ${journalMode} ${journalMode === 'wal' ? '✅' : '⚠️ (Should be WAL)'}`);
        console.log(`- Synchronous: ${synchronous} (0=OFF, 1=NORMAL, 2=FULL)`);
        console.log(`- Busy Timeout: ${busyTimeout}ms ${busyTimeout >= 5000 ? '✅' : '⚠️ (Should be >= 5000)'}`);
        console.log(`- Foreign Keys: ${foreignKeys === 1 ? 'ON ✅' : 'OFF ⚠️'}`);

        // 2. Data Integrity Audit
        console.log('\n[2/4] Data Integrity Audit:');
        const orphans = db.prepare(`
            SELECT id, albumId, originalFilename 
            FROM photos 
            WHERE albumId NOT IN (SELECT id FROM albums)
        `).all();

        if (orphans.length > 0) {
            console.error(`❌ FOUND ${orphans.length} ORPHANED PHOTOS (Missing Album IDs):`);
            orphans.slice(0, 5).forEach((o: any) => console.log(`   - Photo ${o.id}: References Album ${o.albumId} (${o.originalFilename})`));
            if (orphans.length > 5) console.log(`   ... and ${orphans.length - 5} more.`);
        } else {
            console.log('✅ No orphaned photos found.');
        }

        const invalidPhotographers = db.prepare(`
            SELECT id, photographerId, 'albums' as source FROM albums WHERE photographerId != '0' AND photographerId NOT IN (SELECT id FROM users)
            UNION
            SELECT id, photographerId, 'photos' as source FROM photos WHERE photographerId != '0' AND photographerId NOT IN (SELECT id FROM users)
        `).all();

        if (invalidPhotographers.length > 0) {
            console.error(`❌ FOUND ${invalidPhotographers.length} INVALID PHOTOGRAPHER REFERENCES:`);
            invalidPhotographers.slice(0, 5).forEach((p: any) => console.log(`   - ${p.source} ${p.id}: References User ${p.photographerId}`));
        } else {
            console.log('✅ All photographer references are valid.');
        }

        // 3. ID Consistency Check
        console.log('\n[3/4] ID Consistency Audit:');
        const idSamples = db.prepare('SELECT id FROM albums LIMIT 100').all();
        const nonUuid = idSamples.filter((a: any) => typeof a.id === 'string' && a.id.length < 32);
        if (nonUuid.length > 0) {
            console.log(`ℹ️ Info: Found ${nonUuid.length} non-UUID album IDs in sample. (Expected if legacy data exists).`);
        }

        // 4. Performance & Contention Audit
        console.log('\n[4/4] Performance Audit:');
        const photoSize = fs.statSync(dbPath).size;
        console.log(`- Database Size: ${(photoSize / (1024 * 1024)).toFixed(2)} MB`);

        const slowQueries = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM photos WHERE albumId = ?').all('sample');
        console.log(`- Query Plan for Album Search: ${JSON.stringify(slowQueries)}`);
        if (JSON.stringify(slowQueries).includes('SCAN TABLE')) {
            console.warn('⚠️ WARNING: Sequential Scan detected for Album Search. Missing Index on photos(albumId)?');
        } else {
            console.log('✅ Index check passed.');
        }

    } catch (err: any) {
        console.error('❌ Audit encountered an error:', err.message);
    } finally {
        db.close();
        console.log('\n==========================================');
        console.log('✅ Audit Complete.');
    }
}

runAudit();
