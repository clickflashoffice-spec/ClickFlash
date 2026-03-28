console.log("DEBUG: Script Start");
const { DatabaseManager } = require('./backend/shared/db');
const { DB_FILE, UPLOAD_DIR } = require('./backend/config/constants');
const path = require('path');
const fs = require('fs');

async function verify() {
    // 1. Initialize DB and Migrations
    console.log('1. Initializing Database...');
    const dbManager = new DatabaseManager(DB_FILE);
    const migrationsDir = path.join(__dirname, 'backend/shared/migrations');
    dbManager.connect(migrationsDir);
    dbManager.run("DELETE FROM face_indexing_queue");

    console.log('2. Inserting Test Job...');
    // We need a real photo ID. Let's pick one.
    const photo = dbManager.get("SELECT id, url FROM photos LIMIT 1");
    if (!photo) {
        console.error('No photos in database to test.');
        process.exit(0);
    }

    console.log(`   Using Photo ID: ${photo.id}`);
    dbManager.run(
        "INSERT INTO face_indexing_queue (photoId, status) VALUES (?, 'pending')",
        [photo.id]
    );

    // Mock missing services
    const logger = { info: console.log, error: console.error };
    const cloudService = { uploadHighRes: async () => { }, uploadRetentionAsset: async () => { } };

    // Import QueueProcessor (tsx handles TS requirement)
    const { QueueProcessor } = require('./backend/services/QueueProcessor');

    const processor = new QueueProcessor(dbManager, logger, cloudService);
    console.log('3. Starting Queue Processor (In-Process)...');
    processor.start();

    console.log('   Checking status every 2 seconds...');

    let attempts = 0;
    const interval = setInterval(() => {
        const job = dbManager.get("SELECT * FROM face_indexing_queue WHERE photoId = ?", [photo.id]);
        if (job) {
            console.log(`   Status: ${job.status}`);
            if (job.status === 'completed') {
                console.log('   ✅ Job Completed!');
                // Verify faces
                const faces = dbManager.query("SELECT * FROM photo_faces WHERE photoId = ?", [photo.id]);
                console.log(`   Faces Found: ${faces.length}`);
                processor.stop();
                clearInterval(interval);
                process.exit(0);
            } else if (job.status === 'failed') {
                console.error(`   ❌ Job Failed: ${job.error}`);
                processor.stop();
                clearInterval(interval);
                process.exit(1);
            }
        } else {
            console.log('   Job not found?');
        }

        attempts++;
        if (attempts > 30) { // 60 seconds (face loading takes time)
            console.error('   ❌ Timeout waiting for processor.');
            processor.stop();
            clearInterval(interval);
            process.exit(1);
        }
    }, 2000);
}

verify().catch(console.error);
