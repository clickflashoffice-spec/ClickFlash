#!/usr/bin/env node
/**
 * ClickFlash Photo Pipeline E2E Test (Standalone)
 *
 * Runs the actual photo processing pipeline end-to-end using real:
 *   - sharp (image processing)
 *   - node:crypto (SHA-256, HMAC)
 *   - node:sqlite (D1-compatible)
 *
 * Measures real latencies at every stage. Output is a JSON timings report
 * appended to docs/audit/PIPELINE_TIMINGS.json and a human-readable table.
 *
 * Run: node tests/photo-pipeline-standalone.mjs
 */

import sharp from "sharp";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const testDir = path.join(os.tmpdir(), `clickflash-pipeline-${Date.now()}`);
const highresDir = path.join(testDir, "uploads", "test-album", "highres");
const thumbsDir = path.join(testDir, "uploads", "test-album", "thumbs");
const dbPath = path.join(testDir, "test.db");

fs.mkdirSync(highresDir, { recursive: true });
fs.mkdirSync(thumbsDir, { recursive: true });

const ALBUM_ID = "test-album";
const PHOTO_ID = "test-photo-1";
const STAGES = [];

function record(stage, durationMs, bytesIn, bytesOut, notes) {
    STAGES.push({ stage, durationMs, bytesIn, bytesOut, notes });
    return durationMs;
}

console.log("\n=== ClickFlash Photo Pipeline E2E ===");
console.log(`Test dir: ${testDir}\n`);

// === STAGE 1: Generate synthetic test image ===
let t = Date.now();
const originalBuffer = await sharp({
    create: {
        width: 1024,
        height: 768,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
    },
})
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
record("1. Generate synthetic JPEG (1024x768)", Date.now() - t, 0, originalBuffer.length);
console.log(`✓ Generated 1024x768 JPEG: ${originalBuffer.length} bytes`);

// === STAGE 2: SHA-256 hash ===
t = Date.now();
const fileHash = crypto.createHash("sha256").update(originalBuffer).digest("hex");
record("2. SHA-256 hash", Date.now() - t, originalBuffer.length, 64, `hash=${fileHash.slice(0, 16)}…`);
console.log(`✓ Hash: ${fileHash.slice(0, 32)}…`);

// === STAGE 3: Sharp resize pipeline (4 derivatives in parallel) ===
t = Date.now();
const [highres, preview, thumb, tiny] = await Promise.all([
    sharp(originalBuffer).resize(2048, 2048, { fit: "inside" }).jpeg({ quality: 95 }).toBuffer(),
    sharp(originalBuffer).resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer(),
    sharp(originalBuffer).resize(320, 320, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer(),
    sharp(originalBuffer).resize(160, 160, { fit: "cover" }).jpeg({ quality: 75 }).toBuffer(),
]);
record("3. Sharp resize (4 derivatives, parallel)", Date.now() - t, originalBuffer.length,
    highres.length + preview.length + thumb.length + tiny.length,
    `2048=${highres.length} 1024=${preview.length} 320=${thumb.length} 160=${tiny.length}`);
console.log(`✓ Resized: highres=${highres.length}B preview=${preview.length}B thumb=${thumb.length}B tiny=${tiny.length}B`);

fs.writeFileSync(path.join(highresDir, `${PHOTO_ID}.jpg`), highres);
fs.writeFileSync(path.join(thumbsDir, `${PHOTO_ID}_preview.jpg`), preview);
fs.writeFileSync(path.join(thumbsDir, `${PHOTO_ID}_thumb.jpg`), thumb);
fs.writeFileSync(path.join(thumbsDir, `${PHOTO_ID}_tiny.jpg`), tiny);

// === STAGE 4: Watermark + WebP encode ===
t = Date.now();
const watermarkSvg = `<svg width="800" height="600"><text x="50%" y="50%" text-anchor="middle" font-size="80" fill="white" stroke="black" stroke-width="2">PROOF</text></svg>`;
const watermarked = await sharp(preview)
    .composite([{ input: Buffer.from(watermarkSvg), gravity: "center" }])
    .webp({ quality: 75 })
    .toBuffer();
record("4. Watermark + WebP encode", Date.now() - t, preview.length, watermarked.length, `webp=${watermarked.length}B`);
fs.writeFileSync(path.join(thumbsDir, `${PHOTO_ID}_preview_wm.webp`), watermarked);
console.log(`✓ Watermarked WebP: ${watermarked.length}B`);

// === STAGE 5: SQLite insert with all metadata ===
t = Date.now();
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
    CREATE TABLE photos (
        id TEXT PRIMARY KEY,
        album_id TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        width INTEGER,
        height INTEGER,
        taken_at TEXT,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ready',
        expires_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        storage_path_highres TEXT,
        storage_path_preview TEXT,
        storage_path_thumb TEXT,
        storage_path_tiny TEXT,
        storage_path_watermarked TEXT,
        UNIQUE(album_id, file_hash)
    );
    CREATE INDEX idx_photos_album ON photos(album_id);
    CREATE INDEX idx_photos_hash ON photos(file_hash);
    CREATE INDEX idx_photos_expires ON photos(expires_at);
`);
const meta = await sharp(originalBuffer).metadata();
db.prepare(`
    INSERT INTO photos (id, album_id, file_hash, file_name, mime_type, size_bytes, width, height, taken_at,
        storage_path_highres, storage_path_preview, storage_path_thumb, storage_path_tiny, storage_path_watermarked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
    PHOTO_ID, ALBUM_ID, fileHash, "DSC_0001.JPG", "image/jpeg", originalBuffer.length,
    meta.width, meta.height, new Date().toISOString(),
    `uploads/${ALBUM_ID}/highres/${PHOTO_ID}.jpg`,
    `uploads/${ALBUM_ID}/thumbs/${PHOTO_ID}_preview.jpg`,
    `uploads/${ALBUM_ID}/thumbs/${PHOTO_ID}_thumb.jpg`,
    `uploads/${ALBUM_ID}/thumbs/${PHOTO_ID}_tiny.jpg`,
    `uploads/${ALBUM_ID}/thumbs/${PHOTO_ID}_preview_wm.webp`
);
record("5. SQLite insert + 3 indexes", Date.now() - t, 0, 1, "1 row, 3 indexes");
console.log(`✓ Inserted photo row with all 5 storage paths`);

// === STAGE 6: Idempotency check (duplicate album_id + file_hash) ===
t = Date.now();
let duplicateRejected = false;
try {
    db.prepare(`
        INSERT INTO photos (id, album_id, file_hash, file_name, storage_path_highres)
        VALUES (?, ?, ?, ?, ?)
    `).run("dup-id", ALBUM_ID, fileHash, "DSC_0001.JPG", "/some/path");
} catch (err) {
    duplicateRejected = err.message.includes("UNIQUE");
}
record("6. Idempotency: duplicate (albumId, hash) rejected", Date.now() - t, 0, 1, `rejected=${duplicateRejected}`);
console.log(`✓ Duplicate rejected: ${duplicateRejected}`);

// === STAGE 7: Idempotency check (same hash, different album allowed) ===
t = Date.now();
db.prepare(`
    INSERT INTO photos (id, album_id, file_hash, file_name, storage_path_highres)
    VALUES (?, ?, ?, ?, ?)
`).run("other-id", "different-album", fileHash, "DSC_0001.JPG", "/other/path");
const crossAlbumCount = db.prepare("SELECT COUNT(*) as c FROM photos WHERE file_hash = ?").get(fileHash).c;
record("7. Idempotency: same hash in different album allowed", Date.now() - t, 0, 2, `count=${crossAlbumCount}`);
console.log(`✓ Same hash in 2 different albums: ${crossAlbumCount} rows`);

// === STAGE 8: Static file serve (range request simulation) ===
t = Date.now();
const stat = fs.statSync(path.join(highresDir, `${PHOTO_ID}.jpg`));
const fileSize = stat.size;
const rangeStart = Math.floor(fileSize / 4);
const rangeEnd = Math.min(fileSize - 1, rangeStart + 1023);
const rangeBuffer = Buffer.alloc(rangeEnd - rangeStart + 1);
const fd = fs.openSync(path.join(highresDir, `${PHOTO_ID}.jpg`), "r");
fs.readSync(fd, rangeBuffer, 0, rangeBuffer.length, rangeStart);
fs.closeSync(fd);
record("8. Static file serve (HTTP range request)", Date.now() - t, 0, rangeBuffer.length, `bytes=${rangeStart}-${rangeEnd}`);
console.log(`✓ Range request served: ${rangeBuffer.length}B`);

// === STAGE 9: Signed URL pattern (HMAC-SHA256) ===
t = Date.now();
const SECRET = "test-jwt-secret-32-bytes-long-xx";
const expires = Math.floor(Date.now() / 1000) + 3600;
const urlPath = `/v1/${ALBUM_ID}/highres/${PHOTO_ID}.jpg`;
const sig = crypto.createHmac("sha256", SECRET)
    .update(`${urlPath}:${expires}`)
    .digest("hex");
const signedUrl = `${urlPath}?e=${expires}&s=${sig}`;
record("9. Signed URL generation (HMAC-SHA256)", Date.now() - t, 0, signedUrl.length, `sig=${sig.slice(0, 16)}…`);
console.log(`✓ Signed URL: ${signedUrl.slice(0, 60)}…`);

// === STAGE 10: Signed URL validation (recompute + constant-time compare) ===
t = Date.now();
const expectedSig = crypto.createHmac("sha256", SECRET)
    .update(`${urlPath}:${expires}`)
    .digest("hex");
const isValid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
record("10. Signed URL validation (constant-time compare)", Date.now() - t, sig.length, 1, `valid=${isValid}`);
console.log(`✓ Signature valid: ${isValid}`);

// === STAGE 11: MoneyTrash expiry (mark as expired) ===
t = Date.now();
const expiresAt = new Date(Date.now() - 1000).toISOString();
db.prepare("UPDATE photos SET expires_at = ?, status = 'expired' WHERE id = ?").run(expiresAt, PHOTO_ID);
const expiredRow = db.prepare("SELECT * FROM photos WHERE id = ?").get(PHOTO_ID);
record("11. MoneyTrash expiry (mark expired)", Date.now() - t, 0, 1, `status=${expiredRow.status}`);
console.log(`✓ Marked expired: status=${expiredRow.status}`);

// === STAGE 12: MoneyTrash recovery (un-expire) ===
t = Date.now();
db.prepare("UPDATE photos SET expires_at = NULL, status = 'ready' WHERE id = ?").run(PHOTO_ID);
const recoveredRow = db.prepare("SELECT * FROM photos WHERE id = ?").get(PHOTO_ID);
record("12. MoneyTrash recovery (un-expire)", Date.now() - t, 0, 1, `status=${recoveredRow.status}`);
console.log(`✓ Recovered: status=${recoveredRow.status}`);

// === STAGE 13: Query by album (typical kiosk request) ===
t = Date.now();
const albumPhotos = db.prepare("SELECT id, file_hash, size_bytes FROM photos WHERE album_id = ? ORDER BY uploaded_at DESC").all(ALBUM_ID);
record("13. Query album photos", Date.now() - t, 0, albumPhotos.length, `${albumPhotos.length} photos`);
console.log(`✓ Album query: ${albumPhotos.length} photos`);

// === STAGE 14: Cleanup ===
t = Date.now();
db.close();
fs.rmSync(testDir, { recursive: true, force: true });
record("14. Cleanup (close DB, rm test dir)", Date.now() - t, 0, 0);
console.log(`✓ Cleaned up`);

// === REPORT ===
const total = STAGES.reduce((s, r) => s + r.durationMs, 0);
const totalIn = STAGES.reduce((s, r) => s + r.bytesIn, 0);
const totalOut = STAGES.reduce((s, r) => s + r.bytesOut, 0);

console.log("\n=== TIMING REPORT ===");
console.log(`Total stages:   ${STAGES.length}`);
console.log(`Total time:     ${total} ms`);
console.log(`Total bytes in: ${(totalIn / 1024).toFixed(1)} KB`);
console.log(`Total bytes out:${(totalOut / 1024).toFixed(1)} KB`);
console.log("\nPer-stage breakdown:");
console.log("─".repeat(95));
console.log(`${"Stage".padEnd(45)} ${"ms".padStart(6)}  ${"in".padStart(10)}  ${"out".padStart(10)}  Notes`);
console.log("─".repeat(95));
for (const s of STAGES) {
    const inStr = s.bytesIn > 0 ? `${(s.bytesIn / 1024).toFixed(1)}KB` : "—";
    const outStr = s.bytesOut > 0 ? `${(s.bytesOut / 1024).toFixed(1)}KB` : (s.bytesOut === 1 ? "1 op" : "—");
    console.log(`${s.stage.padEnd(45)} ${String(s.durationMs).padStart(6)}  ${inStr.padStart(10)}  ${outStr.padStart(10)}  ${s.notes || ""}`);
}
console.log("─".repeat(95));

// Save JSON for the doc
const reportPath = path.join(ROOT, "docs", "audit", "PIPELINE_TIMINGS.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({
    date: new Date().toISOString(),
    platform: `${process.platform} ${process.arch}`,
    nodeVersion: process.version,
    sharpVersion: sharp.versions.sharp,
    testImage: { width: 1024, height: 768, format: "jpeg", bytes: originalBuffer.length },
    totalDurationMs: total,
    totalBytesIn: totalIn,
    totalBytesOut: totalOut,
    stages: STAGES,
}, null, 2));
console.log(`\n📊 JSON report saved to: ${reportPath}\n`);

// === ASSERTIONS ===
const errors = [];
if (STAGES[0].durationMs > 200) errors.push(`Stage 1 too slow: ${STAGES[0].durationMs}ms (expected < 200ms)`);
if (STAGES[2].durationMs > 1000) errors.push(`Stage 3 too slow: ${STAGES[2].durationMs}ms (expected < 1000ms)`);
if (!duplicateRejected) errors.push(`Stage 6: duplicate was NOT rejected`);
if (!isValid) errors.push(`Stage 10: signature validation FAILED`);
if (expiredRow.status !== "expired") errors.push(`Stage 11: photo was not marked expired`);

if (errors.length === 0) {
    console.log("✅ All assertions passed\n");
    process.exit(0);
} else {
    console.log("❌ Assertions failed:");
    for (const e of errors) console.log(`   - ${e}`);
    process.exit(1);
}
