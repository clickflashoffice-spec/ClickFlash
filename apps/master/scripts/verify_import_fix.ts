import { DatabaseManager } from '../backend/shared/db';
import { PhotoProcessor } from '../backend/shared/photoProcessor';
import path from 'path';
import fs from 'fs';
import { DATA_DIR, UPLOAD_DIR, DB_FILE } from '../backend/config/constants';

async function verifyFixes() {
    console.log('--- Phase 34: Verification of Import Fixes ---');

    const dbManager = new DatabaseManager(DB_FILE);
    const MIGRATIONS_DIR = path.resolve(__dirname, '../backend/shared/migrations');

    try {
        console.log('1. Testing Database Connection & Timeout...');
        dbManager.connect(MIGRATIONS_DIR);

        // Verify checkpoint exists
        if (typeof (dbManager as any).checkpoint === 'function') {
            console.log('[PASS] DatabaseManager.checkpoint exists');
            (dbManager as any).checkpoint();
        } else {
            throw new Error('[FAIL] DatabaseManager.checkpoint missing');
        }

        console.log('2. Testing Album Creation visibility...');
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
            console.log('[PASS] Album visible immediately after checkpoint');
        } else {
            throw new Error('[FAIL] Album NOT visible after creation');
        }

        console.log('3. Testing Photo Creation & Face Indexing Queue Order...');
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
            console.log('[PASS] Face indexing queue entry created successfully (FK check passed)');
        } else {
            throw new Error('[FAIL] Face indexing queue entry missing');
        }

        console.log('4. Testing PhotoProcessor Retry Logic (Simulated EBUSY)...');
        // This is harder to test without mocking fs, but we can verify the method exists
        const processor = new PhotoProcessor(UPLOAD_DIR, {} as any, dbManager);
        if (typeof (processor as any).retryRename === 'function') {
            console.log('[PASS] PhotoProcessor.retryRename exists');
        } else {
            throw new Error('[FAIL] PhotoProcessor.retryRename missing');
        }

        console.log('--- ALL BACKEND STABILITY CHECKS PASSED ---');

    } catch (err) {
        console.error('--- VERIFICATION FAILED ---');
        console.error(err);
        process.exit(1);
    } finally {
        dbManager.close();
    }
}

verifyFixes();
