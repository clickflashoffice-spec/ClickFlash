
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../backend/data/master.db');
const UPLOAD_DIR = path.join(__dirname, '../local/uploads');

if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}`);
    process.exit(1);
}

const db = new Database(DB_PATH, { verbose: null });

console.log('--- Starting System-Wide Asset Audit ---');
console.log(`DB Path: ${DB_PATH}`);
console.log(`Upload Dir: ${UPLOAD_DIR}`);

const photos = db.prepare('SELECT id, albumId, url, thumbnailUrl, previewUrl, tinyUrl FROM photos').all();
console.log(`Found ${photos.length} photo records.`);

let missingCount = 0;
let corruptPathCount = 0;
let totalChecked = 0;

function checkFile(label, relativePath, albumId) {
    if (!relativePath) return 'OK (Empty)';

    // Check for HTTP corruption
    if (relativePath.startsWith('http')) {
        return 'FAIL (HTTP Prefix)';
    }

    // Check 1: Direct Path
    const directPath = path.join(UPLOAD_DIR, relativePath);
    if (fs.existsSync(directPath)) return 'OK';

    // Check 2: Structured Path
    if (albumId) {
        // Check if relativePath already starts with albumId
        const normalized = relativePath.replace(/\\/g, '/');
        if (!normalized.startsWith(albumId)) {
            const thumbsPath = path.join(UPLOAD_DIR, albumId, 'thumbs', relativePath);
            if (fs.existsSync(thumbsPath)) return 'OK (Structured/Thumbs)';

            const highresPath = path.join(UPLOAD_DIR, albumId, 'highres', relativePath);
            if (fs.existsSync(highresPath)) return 'OK (Structured/Highres)';
        }
    }

    return `MISSING (${relativePath})`;
}

const errors = [];

photos.forEach(photo => {
    totalChecked++;
    const checks = {
        Main: checkFile('Main', photo.url, photo.albumId),
        Thumb: checkFile('Thumb', photo.thumbnailUrl, photo.albumId),
        Preview: checkFile('Preview', photo.previewUrl, photo.albumId),
        Tiny: checkFile('Tiny', photo.tinyUrl, photo.albumId)
    };

    const failed = Object.entries(checks).filter(([k, v]) => v.startsWith('FAIL') || v.startsWith('MISSING'));

    if (failed.length > 0) {
        missingCount++;
        errors.push({
            id: photo.id,
            albumId: photo.albumId,
            failures: failed.map(([k, v]) => `${k}: ${v}`)
        });
    }

    if (photo.url.startsWith('http') || (photo.thumbnailUrl && photo.thumbnailUrl.startsWith('http'))) {
        corruptPathCount++;
    }
});

console.log(`\n--- Audit Results ---`);
console.log(`Total Photos: ${totalChecked}`);
console.log(`Issues Found: ${missingCount}`);
console.log(`Corrupt Paths (HTTP): ${corruptPathCount}`);

if (errors.length > 0) {
    console.log('\n--- Details (First 20) ---');
    errors.slice(0, 20).forEach(e => {
        console.log(`[${e.id}] Album: ${e.albumId} -> ${e.failures.join(', ')}`);
    });

    // Save full report
    const reportPath = path.join(__dirname, 'audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(errors, null, 2));
    console.log(`\nFull report saved to ${reportPath}`);
} else {
    console.log('\n✅ System Clean! All assets verified.');
}
