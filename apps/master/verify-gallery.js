
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Configuration
const DB_PATH = path.join(__dirname, 'data', 'master.db');
const UPLOAD_DIR = path.join(__dirname, 'pb_data', 'storage');
const TEST_ALBUM_ID = 'test_gallery_album_001';
const TEST_PHOTO_ID = 'test_gallery_photo_001';
const TEST_PHOTO_FILENAME = 'test_gallery_photo.jpg';
const SERVER_URL = 'http://localhost:8090';

// Ensure paths exist
if (!fs.existsSync(DB_PATH)) {
    console.error(`[Error] Database not found at ${DB_PATH}`);
    process.exit(1);
}
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Create DB connection
const db = new Database(DB_PATH);

async function runTest() {
    console.log('[Test] Starting Gallery Watermark Verification (Fetch Mode)...');

    // 1. Setup Test Data
    console.log('[Test] Setting up test data (Album + Photo)...');

    // Clean up previous runs
    db.prepare('DELETE FROM photos WHERE id = ?').run(TEST_PHOTO_ID);
    db.prepare('DELETE FROM albums WHERE id = ?').run(TEST_ALBUM_ID);

    // Create dummy image file
    const photoPath = path.join(UPLOAD_DIR, TEST_PHOTO_FILENAME);
    if (!fs.existsSync(photoPath)) {
        // Create a minimal valid JPEG header
        const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
        fs.writeFileSync(photoPath, jpegHeader);
        console.warn('[Warn] Created minimal fake JPEG. Watermarking might fail if strict image decoding is used.');
    }

    // Insert Album
    db.prepare(`
        INSERT INTO albums (id, title, status, created, updated) 
        VALUES (?, 'Test Gallery Album', 'Finalized', datetime('now'), datetime('now'))
    `).run(TEST_ALBUM_ID);

    // Insert Photo
    db.prepare(`
        INSERT INTO photos (id, albumId, url, originalFilename, created, updated) 
        VALUES (?, ?, ?, 'test_photo.jpg', datetime('now'), datetime('now'))
    `).run(TEST_PHOTO_ID, TEST_ALBUM_ID, TEST_PHOTO_FILENAME);

    // 2. Trigger Export API
    console.log('[Test] Triggering Export API...');
    try {
        const res = await fetch(`${SERVER_URL}/api/gallery/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                albumId: TEST_ALBUM_ID,
                watermarkConfig: {
                    text: 'VERIFY TEST',
                    opacity: 0.5
                }
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API Error ${res.status}: ${text}`);
        }

        const data = await res.json();
        console.log('[Test] API Response:', JSON.stringify(data, null, 2));

        // 3. Verify Output
        if (data.success) {
            const result = data.watermarkedPhotos[0];
            console.log('[Test] Verify Result:', result);

            if (result.error) {
                console.warn('[Test] Worker reported error (Expected with fake image):', result.error);
            } else {
                console.log('[Test] Worker Success!');
            }

            // 4. Verify Caching (Call again)
            console.log('[Test] Verifying Caching...');
            const start = Date.now();
            const res2 = await fetch(`${SERVER_URL}/api/gallery/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ albumId: TEST_ALBUM_ID })
            });
            await res2.json();
            const duration = Date.now() - start;
            console.log(`[Test] Second Call Duration: ${duration}ms (Should be << First Call)`);
        }

    } catch (error) {
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            console.error('[Error] Server is NOT running at ' + SERVER_URL);
            console.error('Please start the backend server with: npm run dev:backend');
        } else {
            console.error('[Test] API Call Failed:', error.message);
        }
    } finally {
        // 5. Cleanup
        console.log('[Test] Cleaning up...');
        db.prepare('DELETE FROM photos WHERE id = ?').run(TEST_PHOTO_ID);
        db.prepare('DELETE FROM albums WHERE id = ?').run(TEST_ALBUM_ID);
        if (fs.existsSync(photoPath) && fs.readFileSync(photoPath).length < 20) {
            fs.unlinkSync(photoPath);
        }
    }
}

runTest();
