
const Database = require('better-sqlite3');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'pb_data');
const DB_PATH = path.join(DATA_DIR, 'master.db');

console.log(`Openining Database: ${DB_PATH}`);
let db;
try {
    db = new Database(DB_PATH);
} catch (err) {
    console.error("Failed to open DB. Ensure the server is STOPPED before running this script.");
    console.error(err);
    process.exit(1);
}

console.log('--- Cleaning Photos Table Paths ---');

// 1. Identify corrupted rows
const checkQuery = "SELECT COUNT(*) as count FROM photos WHERE url LIKE 'http%'";
const countBefore = db.prepare(checkQuery).get().count;

console.log(`Found ${countBefore} corrupted records.`);

if (countBefore > 0) {
    // 2. Update rows
    // Remove the prefix: http://localhost:8090/api/files/photos/{id}/
    // We can't easily extract {id} in SQL replacement if it varies.
    // So we'll iterate and update.

    const corruptedPhotos = db.prepare("SELECT id, url, thumbnailUrl, previewUrl FROM photos WHERE url LIKE 'http%'").all();

    const updateStmt = db.prepare("UPDATE photos SET url = ?, thumbnailUrl = ?, previewUrl = ?, updated = CURRENT_TIMESTAMP WHERE id = ?");

    let fixedCount = 0;

    const cleanPath = (fullPath) => {
        if (!fullPath || !fullPath.startsWith('http')) return fullPath;
        // Split by '/' and take the last part (filename)
        // e.g. http://.../abcdef_thumb.jpg -> abcdef_thumb.jpg
        const parts = fullPath.split('/');
        return parts[parts.length - 1];
    };

    db.transaction(() => {
        corruptedPhotos.forEach(p => {
            const newUrl = cleanPath(p.url);
            const newThumb = cleanPath(p.thumbnailUrl);
            const newPreview = cleanPath(p.previewUrl);

            console.log(`Fixing [${p.id}]: ${p.url} -> ${newUrl}`);
            updateStmt.run(newUrl, newThumb, newPreview, p.id);
            fixedCount++;
        });
    })();

    console.log(`Successfully fixed ${fixedCount} records.`);
} else {
    console.log("No corruption found.");
}

db.close();
