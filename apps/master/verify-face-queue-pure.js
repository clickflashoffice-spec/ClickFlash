const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_FILE = 'master.db'; // Assuming default

async function verify() {
    console.log('DEBUG: Script Start');

    if (!fs.existsSync(DB_FILE)) {
        console.log('Waiting for DB creation by server...');
    }

    const db = new Database(DB_FILE);
    console.log('Connected to DB.');

    // Wait for table
    console.log('Waiting for face_indexing_queue table...');
    let tableExists = false;
    for (let i = 0; i < 30; i++) {
        const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='face_indexing_queue'").get();
        if (row) {
            tableExists = true;
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    if (!tableExists) {
        console.error('❌ Table face_indexing_queue not found after 30s. Did server run migrations?');
        process.exit(1);
    }
    console.log('✅ Table found.');

    // Clean queue
    db.prepare("DELETE FROM face_indexing_queue").run();

    // Get Photo
    const photo = db.prepare("SELECT id FROM photos LIMIT 1").get();
    if (!photo) {
        console.error('❌ No photos found to test.');
        process.exit(1);
    }
    console.log(`Using Photo ID: ${photo.id}`);

    // Insert Job
    db.prepare("INSERT INTO face_indexing_queue (photoId, status, priority) VALUES (?, 'pending', 1)").run(photo.id);
    console.log('Job inserted. Waiting for processing...');

    // Poll for completion
    for (let i = 0; i < 30; i++) {
        const job = db.prepare("SELECT * FROM face_indexing_queue WHERE photoId = ?").get(photo.id);
        if (job) {
            console.log(`Job Status: ${job.status}`);
            if (job.status === 'completed') {
                console.log('✅ Job Completed!');
                // Check faces
                const count = db.prepare("SELECT count(*) as c FROM photo_faces WHERE photoId = ?").get(photo.id).c;
                console.log(`Faces count: ${count}`);
                process.exit(0);
            } else if (job.status === 'failed') {
                console.error(`❌ Job Failed: ${job.error}`);
                // Print error but don't exit yet? No, fail.
                process.exit(1);
            }
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    console.error('❌ Timeout waiting for processing.');
    process.exit(1);
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
