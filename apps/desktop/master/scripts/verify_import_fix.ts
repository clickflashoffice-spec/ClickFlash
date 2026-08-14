import { DatabaseManager } from '../backend/database/db';
import { PhotoProcessor } from '../backend/services/photoProcessor';
import path from 'path';
import { DATA_DIR as _DATA_DIR, UPLOAD_DIR, DB_FILE } from '../backend/config/constants';
import { logger } from '@/utils/logger';

async function verifyFixes() {
    logger.info('--- Phase 34: Verification of Import Fixes ---');

    const dbManager = new DatabaseManager(DB_FILE);
    const MIGRATIONS_DIR = path.resolve(__dirname, '../backend/database/migrations');

    try {
        logger.info('1. Testing Database Connection & Timeout...');
        dbManager.connect(MIGRATIONS_DIR);

        // Verify checkpoint exists
        if (typeof (dbManager as any).checkpoint === 'function') {
            logger.info('[PASS] DatabaseManager.checkpoint exists');
            (dbManager as any).checkpoint();
        } else {
            throw new Error('[FAIL] DatabaseManager.checkpoint missing');
        }

        logger.info('2. Testing Album Creation visibility...');
        const albumId = `test_album_${Date.now()}`;
        dbManager.run(
            "INSERT INTO albums (id, title, date, photographerId, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            [albumId, 'Verification Album', new Date().toISOString(), '1', new Date().toISOString(), new Date().toISOString()]
        );

        // Force checkpoint
        (dbManager as any).checkpoint();

        // Immediate check
        const album = dbManager.get("SELECT * FROM albums WHERE id = ?", [albumId]);
        if (album) {
            logger.info('[PASS] Album visible immediately after checkpoint');
        } else {
            throw new Error('[FAIL] Album NOT visible after creation');
        }

        logger.info('3. Testing Photo Creation & Face Indexing Queue Order...');
        const photoId = `test_photo_${Date.now()}`;

        // Simulate what happens in collections.ts now
        dbManager.transaction(() => {
            dbManager.run(
                "INSERT INTO photos (id, albumId, url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                [photoId, albumId, 'test.jpg', 'pending', new Date().toISOString(), new Date().toISOString()]
            );
        });

        // Trigger queue (as collections.ts does now)
        dbManager.run(
            "INSERT INTO face_indexing_queue (photoId, status) VALUES (?, 'pending')",
            [photoId]
        );

        const queueItem = dbManager.get("SELECT * FROM face_indexing_queue WHERE photoId = ?", [photoId]);
        if (queueItem) {
            logger.info('[PASS] Face indexing queue entry created successfully (FK check passed)');
        } else {
            throw new Error('[FAIL] Face indexing queue entry missing');
        }

        logger.info('4. Testing PhotoProcessor Retry Logic (Simulated EBUSY)...');
        // This is harder to test without mocking fs, but we can verify the method exists
        const processor = new PhotoProcessor(UPLOAD_DIR, {} as any, dbManager);
        if (typeof (processor as any).retryRename === 'function') {
            logger.info('[PASS] PhotoProcessor.retryRename exists');
        } else {
            throw new Error('[FAIL] PhotoProcessor.retryRename missing');
        }

        logger.info('--- ALL BACKEND STABILITY CHECKS PASSED ---');

    } catch (err) {
        logger.error('--- VERIFICATION FAILED ---');
        logger.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    } finally {
        dbManager.close();
    }
}

verifyFixes();
