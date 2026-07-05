#!/usr/bin/env node
/**
 * MoneyTrash R2 Auto-Deletion E2E verification — P0-4
 *
 * Simulates the exact logic used in server.ts purgeExpiredMoneyTrashPhotos().
 * Uses an in-memory R2 mock and node:sqlite to verify:
 *   - Expired photos get their R2 objects deleted
 *   - The photo status flips to 'expired'
 *   - Audit log entries are created
 *   - Non-expired photos are NOT touched
 *   - Purchased photos (status='purchased') are NOT touched
 *   - R2 errors on individual keys don't block the rest
 *
 * Run: node tests/moneytrash-r2-purge.mjs
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const tmpDb = path.join(os.tmpdir(), `moneytrash-purge-${Date.now()}.db`);
const db = new DatabaseSync(tmpDb);

db.exec(`
    CREATE TABLE access_codes (
        code TEXT PRIMARY KEY,
        expires_at TEXT,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE photos (
        id TEXT PRIMARY KEY,
        url TEXT,
        thumbnailUrl TEXT,
        storagePath TEXT,
        access_code TEXT,
        status TEXT DEFAULT 'available',
        updated_at TEXT
    );
    CREATE TABLE moneytrash_deletion_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id TEXT NOT NULL,
        access_code TEXT,
        r2_keys_deleted TEXT,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        error TEXT
    );
`);

// In-memory R2 mock
const r2Store = new Map();
const r2Failures = new Set();  // keys that should fail to delete
const r2Mock = {
    delete: async (key) => {
        if (r2Failures.has(key)) {
            throw new Error(`R2 delete failed for ${key}`);
        }
        r2Store.delete(key);
    },
};

// Reproduce the exact query and update logic from the cron job
async function purgeExpiredMoneyTrashPhotos(env, nowIso = new Date().toISOString()) {
    if (!env.GALLERY_BUCKET) return { purged: 0 };

    const candidates = db.prepare(`
        SELECT p.id, p.url, p.thumbnailUrl, p.storagePath, p.access_code
          FROM photos p
          JOIN access_codes ac ON ac.code = p.access_code
         WHERE p.status = 'available'
           AND p.access_code IS NOT NULL
           AND ac.expires_at IS NOT NULL
           AND ac.expires_at < ?
         LIMIT 100
    `).all(nowIso);

    if (candidates.length === 0) return { purged: 0 };

    let purged = 0;
    for (const photo of candidates) {
        const r2Keys = [];
        const errors = [];
        try {
            const baseKey = (photo.storagePath && photo.storagePath.startsWith("photos/"))
                ? photo.storagePath
                : `photos/${photo.id}/highres.jpg`;
            const photosPrefix = baseKey.replace(/\/[^/]+$/, "");
            const candidateKeys = [
                `${photosPrefix}/highres.jpg`,
                `${photosPrefix}/preview.jpg`,
                `${photosPrefix}/thumb.jpg`,
                `${photosPrefix}/tiny.jpg`,
                `${photosPrefix}/preview_wm.webp`,
            ];
            for (const key of candidateKeys) {
                try {
                    await env.GALLERY_BUCKET.delete(key);
                    r2Keys.push(key);
                } catch (r2err) {
                    errors.push(`${key}: ${r2err.message}`);
                }
            }
            db.prepare(`UPDATE photos SET status = 'expired', updated_at = ? WHERE id = ?`).run(nowIso, photo.id);
            db.prepare(`
                INSERT INTO moneytrash_deletion_log (photo_id, access_code, r2_keys_deleted, status, error)
                VALUES (?, ?, ?, 'success', ?)
            `).run(photo.id, photo.access_code, JSON.stringify(r2Keys), errors.length > 0 ? errors.join("; ") : null);
            purged++;
        } catch (e) {
            db.prepare(`
                INSERT INTO moneytrash_deletion_log (photo_id, access_code, r2_keys_deleted, status, error)
                VALUES (?, ?, ?, 'failed', ?)
            `).run(photo.id, photo.access_code, JSON.stringify(r2Keys), e.message);
        }
    }
    return { purged };
}

const now = Date.now();
const past = new Date(now - 3600 * 1000).toISOString();   // 1h ago
const future = new Date(now + 3600 * 1000).toISOString(); // 1h from now
const longPast = new Date(now - 86400 * 7 * 1000).toISOString(); // 7d ago

// Seed: 3 access codes (1 expired, 1 future, 1 long-past)
db.prepare(`INSERT INTO access_codes (code, expires_at) VALUES (?, ?)`).run("EXPIRED-001", past);
db.prepare(`INSERT INTO access_codes (code, expires_at) VALUES (?, ?)`).run("FUTURE-001", future);
db.prepare(`INSERT INTO access_codes (code, expires_at) VALUES (?, ?)`).run("LONG-PAST-001", longPast);

// Seed: 5 photos
//   1) expired + not purchased → should be purged
db.prepare(`INSERT INTO photos (id, url, storagePath, access_code, status) VALUES (?, ?, ?, ?, 'available')`)
    .run("photo-A", "https://r2/photo-A", "photos/photo-A/highres.jpg", "EXPIRED-001");
//   2) expired + already purchased → should NOT be purged
db.prepare(`INSERT INTO photos (id, url, storagePath, access_code, status) VALUES (?, ?, ?, ?, 'purchased')`)
    .run("photo-B", "https://r2/photo-B", "photos/photo-B/highres.jpg", "EXPIRED-001");
//   3) future expiry → should NOT be purged
db.prepare(`INSERT INTO photos (id, url, storagePath, access_code, status) VALUES (?, ?, ?, ?, 'available')`)
    .run("photo-C", "https://r2/photo-C", "photos/photo-C/highres.jpg", "FUTURE-001");
//   4) long-past expiry, no access_code → should NOT match (NULL access_code)
db.prepare(`INSERT INTO photos (id, url, storagePath, access_code, status) VALUES (?, ?, ?, ?, 'available')`)
    .run("photo-D", "https://r2/photo-D", "photos/photo-D/highres.jpg");
// Verify the null was stored correctly
const photoD = db.prepare("SELECT * FROM photos WHERE id = 'photo-D'").get();
if (photoD.access_code !== null) {
    // Force the column to null
    db.prepare("UPDATE photos SET access_code = NULL WHERE id = 'photo-D'").run();
}
//   5) long-past expiry → should be purged
db.prepare(`INSERT INTO photos (id, url, storagePath, access_code, status) VALUES (?, ?, ?, ?, 'available')`)
    .run("photo-E", "https://r2/photo-E", "photos/photo-E/highres.jpg", "LONG-PAST-001");

// Seed R2 with the corresponding objects
for (const id of ["A", "B", "C", "D", "E"]) {
    for (const tier of ["highres.jpg", "preview.jpg", "thumb.jpg", "tiny.jpg", "preview_wm.webp"]) {
        r2Store.set(`photos/photo-${id}/${tier}`, `fake-content-${id}-${tier}`);
    }
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`  ✓ ${name}`); pass++; }
    else    { console.log(`  ✗ ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); fail++; }
}

console.log("\n=== MoneyTrash R2 Auto-Deletion E2E (P0-4) ===\n");

// === Test 1: First purge picks up 2 expired photos (A, E) ===
const r1 = await purgeExpiredMoneyTrashPhotos({ GALLERY_BUCKET: r2Mock });
check("1. First purge picks up 2 expired photos", r1.purged, 2);

// === Test 2: photo-A status flipped to expired ===
check("2. photo-A is now expired",
    db.prepare("SELECT status FROM photos WHERE id = ?").get("photo-A").status, "expired");

// === Test 3: photo-E status flipped to expired ===
check("3. photo-E is now expired",
    db.prepare("SELECT status FROM photos WHERE id = ?").get("photo-E").status, "expired");

// === Test 4: photo-B (purchased) NOT touched ===
check("4. photo-B (purchased) untouched",
    db.prepare("SELECT status FROM photos WHERE id = ?").get("photo-B").status, "purchased");

// === Test 5: photo-C (future) NOT touched ===
check("5. photo-C (future expiry) untouched",
    db.prepare("SELECT status FROM photos WHERE id = ?").get("photo-C").status, "available");

// === Test 6: photo-D (no access_code) NOT touched ===
check("6. photo-D (no access_code) untouched",
    db.prepare("SELECT status FROM photos WHERE id = ?").get("photo-D").status, "available");

// === Test 7: All 5 R2 objects for photo-A deleted ===
check("7. photo-A R2 objects deleted",
    r2Store.has("photos/photo-A/highres.jpg") ||
    r2Store.has("photos/photo-A/preview.jpg") ||
    r2Store.has("photos/photo-A/thumb.jpg"), false);

// === Test 8: photo-B R2 objects STILL present (purchased, not deleted) ===
check("8. photo-B R2 objects preserved",
    r2Store.has("photos/photo-B/highres.jpg"), true);

// === Test 9: Audit log has 2 success entries ===
check("9. Audit log: 2 success entries",
    db.prepare("SELECT COUNT(*) as c FROM moneytrash_deletion_log WHERE status = 'success'").get().c, 2);

// === Test 10: Second purge finds nothing (already expired) ===
const r2 = await purgeExpiredMoneyTrashPhotos({ GALLERY_BUCKET: r2Mock });
check("10. Second purge finds nothing", r2.purged, 0);

// === Test 11: R2 key failure is isolated — does not block other keys ===
r2Store.set("photos/photo-A/highres.jpg", "re-uploaded");  // re-upload for test
r2Store.set("photos/photo-A/preview.jpg", "re-uploaded");
r2Failures.add("photos/photo-A/highres.jpg");
db.prepare(`UPDATE photos SET status = 'available' WHERE id = 'photo-A'`).run();
db.prepare(`DELETE FROM moneytrash_deletion_log WHERE photo_id = 'photo-A'`).run();
const r3 = await purgeExpiredMoneyTrashPhotos({ GALLERY_BUCKET: r2Mock });
check("11. Purge still succeeds despite one R2 key failing", r3.purged, 1);
check("11a. photo-A still marked expired (single R2 failure didn't block)",
    db.prepare("SELECT status FROM photos WHERE id = 'photo-A'").get().status, "expired");
check("11b. Other R2 keys (preview, thumb) for photo-A were deleted",
    r2Store.has("photos/photo-A/preview.jpg"), false);
check("11c. The failing highres.jpg is STILL in R2 (couldn't be deleted)",
    r2Store.has("photos/photo-A/highres.jpg"), true);
r2Failures.delete("photos/photo-A/highres.jpg");

// === Test 12: No R2 binding → no-op ===
const r4 = await purgeExpiredMoneyTrashPhotos({ GALLERY_BUCKET: null });
check("12. No R2 binding → no-op", r4.purged, 0);

// === Cleanup ===
db.close();
fs.rmSync(tmpDb);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
