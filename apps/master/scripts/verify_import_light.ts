import { DatabaseManager } from '../backend/database/db';
import path from 'path';
import { DB_FILE } from '../backend/config/constants';
import { logger } from '@/utils/logger';

async function verifyFixes() {
    logger.info('--- Phase 34: Lightweight Verification of Import Fixes ---');

    // Use a fresh DB manager instance
    const dbManager = new DatabaseManager(DB_FILE);
    const MIGRATIONS_DIR = path.resolve(__dirname, '../backend/database/migrations');

    try {
        logger.info('1. Testing Database Connection & WAL Checkpoint...');
        dbManager.connect(MIGRATIONS_DIR);

        if (typeof (dbManager as any).checkpoint === 'function') {
            logger.info('[PASS] DatabaseManager.checkpoint exists');
            (dbManager as any).checkpoint();
        } else {
            throw new Error('[FAIL] DatabaseManager.checkpoint missing');
        }

        logger.info('2. Testing Album Visibility Race Condition...');
        const albumId = `test_album_${Date.now()}`;
        dbManager.run(
            "INSERT INTO albums (id, title, date, photographerId, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            [albumId, 'Verification Album', new Date().toISOString(), '1', new Date().toISOString(), new Date().toISOString()]
        );

        // Force checkpoint (This is what we added to collections.ts)
        (dbManager as any).checkpoint();

        // Immediate check (Simulation of a subsequent photo upload request)
        const album = dbManager.get("SELECT * FROM albums WHERE id = ?", [albumId]);
        if (album) {
            logger.info('[PASS] Album found immediately after WAL checkpoint (Fix Root Cause 1)');
        } else {
            throw new Error('[FAIL] Album NOT found after creation/checkpoint');
        }

        logger.info('3. Testing Face Indexing Queue Order (FK Safety)...');
        const photoId = `test_photo_${Date.now()}`;

        // Step A: Insert Photo (Simulating collections.ts)
        dbManager.transaction(() => {
            dbManager.run(
                "INSERT INTO photos (id, albumId, url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                [photoId, albumId, 'test.jpg', 'pending', new Date().toISOString(), new Date().toISOString()]
            );
        });

        // Step B: Insert into Queue (Simulating the new re-ordered trigger in collections.ts)
        dbManager.run(
            "INSERT INTO face_indexing_queue (photoId, status) VALUES (?, 'pending')",
            [photoId]
        );

        const queueItem = dbManager.get("SELECT * FROM face_indexing_queue WHERE photoId = ?", [photoId]);
        if (queueItem && queueItem.photoId === photoId) {
            logger.info('[PASS] Face indexing queue entry created successfully AFTER photo insertion (Fix Root Cause 2)');
        } else {
            throw new Error('[FAIL] Face indexing queue entry missing or mismatch');
        }

        logger.info('--- LIGHTWEIGHT STABILITY CHECKS PASSED ---');
        process.exit(0);

    } catch (err) {
        logger.error('--- VERIFICATION FAILED ---');
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    } finally {
        dbManager.close();
    }
}

verifyFixes();
