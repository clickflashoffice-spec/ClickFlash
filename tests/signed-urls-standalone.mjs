#!/usr/bin/env node
/**
 * Signed URLs E2E verification — P0-2
 *
 * Replicates the exact algorithm used by shared/signedUrls.ts to produce
 * a known-good signature, then verifies it. Uses the same constants and
 * crypto APIs as the production code.
 *
 * Run: node tests/signed-urls-standalone.mjs
 */

import crypto from "node:crypto";

const TEST_SECRET = "test-secret-key-32-chars-min-required";
const DEFAULT_TTL = 3600;
const MAX_TTL = 86400;
const CLOCK_SKEW = 300;

function computeSig(secret, pathOnly, expires, kid) {
    const payload = kid ? `${kid}:${pathOnly}:${expires}` : `${pathOnly}:${expires}`;
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function sign(filePath, opts = {}) {
    const ttl = Math.min(Math.max(opts.ttlSeconds ?? DEFAULT_TTL, 1), MAX_TTL);
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const kid = opts.kid || "default";
    const sig = computeSig(TEST_SECRET, filePath, expires, kid);
    return `${filePath}?e=${expires}&s=${sig}&k=${kid}`;
}

function verify(pathOnly, query) {
    const expires = parseInt(String(query.e ?? ""), 10);
    const sig = String(query.s ?? "");
    const kid = String(query.k ?? "default");
    if (!expires || !sig) return { valid: false, reason: "missing_params" };
    const now = Math.floor(Date.now() / 1000);
    if (now > expires + CLOCK_SKEW) return { valid: false, reason: "expired" };
    const expected = computeSig(TEST_SECRET, pathOnly, expires, kid);
    if (sig.length !== expected.length) return { valid: false, reason: "bad_signature" };
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    return ok ? { valid: true } : { valid: false, reason: "bad_signature" };
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`  ✓ ${name}`); pass++; }
    else    { console.log(`  ✗ ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); fail++; }
}

console.log("\n=== Signed URLs E2E (P0-2) ===\n");

// === Test 1: Sign + verify round trip ===
const url1 = sign("/api/files/photos/abc123.jpg", { ttlSeconds: 600 });
const u1 = new URL(url1, "http://127.0.0.1");
const r1 = verify(u1.pathname, { e: u1.searchParams.get("e"), s: u1.searchParams.get("s"), k: u1.searchParams.get("k") });
check("1. Sign + verify round trip", r1.valid, true);

// === Test 2: Tampered signature is rejected ===
const u2 = new URL(url1, "http://127.0.0.1");
const r2 = verify(u2.pathname, { e: u2.searchParams.get("e"), s: "a".repeat(64), k: u2.searchParams.get("k") });
check("2. Tampered signature rejected", r2.valid, false);
check("2a. Reason is bad_signature", r2.reason, "bad_signature");

// === Test 3: Path mismatch detected via signature ===
const r3 = verify("/api/files/photos/OTHER.jpg", { e: u1.searchParams.get("e"), s: u1.searchParams.get("s"), k: u1.searchParams.get("k") });
check("3. Path mismatch rejected", r3.valid, false);

// === Test 4: Missing params ===
const r4a = verify("/x", {});
check("4a. Empty query → missing_params", r4a.reason, "missing_params");
const r4b = verify("/x", { e: "12345" });
check("4b. Sig missing → missing_params", r4b.reason, "missing_params");

// === Test 5: Expired URL detected via tampered expiry ===
const realUrl = sign("/api/files/photos/old.jpg", { ttlSeconds: 600 });
const ru = new URL(realUrl, "http://127.0.0.1");
// Tamper the expiry to be in the past — signature won't match, so this is
// a combined "expired AND bad_signature" test. The verify() function will
// detect the expiry check failure with reason="expired" if we preserve
// the original sig... so let's compute a sig for the past expiry.
const pastExpiry = Math.floor(Date.now() / 1000) - 7200;
const pastSig = computeSig(TEST_SECRET, ru.pathname, pastExpiry, "default");
const r5 = verify(ru.pathname, { e: String(pastExpiry), s: pastSig, k: "default" });
check("5. Expired URL rejected (valid sig, past expiry)", r5.valid, false);
check("5a. Reason is expired", r5.reason, "expired");

// === Test 6: TTL capped at 24h ===
const hugeUrl = sign("/api/files/photos/huge.jpg", { ttlSeconds: 30 * 86400 });
const hu = new URL(hugeUrl, "http://127.0.0.1");
const expiry = parseInt(hu.searchParams.get("e"), 10);
const diff = expiry - Math.floor(Date.now() / 1000);
check("6. TTL capped at 24h", diff <= 86400 + 5 && diff >= 86400 - 60, true);

// === Test 7: Determinism — same path+secret+expiry = same sig ===
const exp = Math.floor(Date.now() / 1000) + 3600;
const s1 = computeSig(TEST_SECRET, "/p1", exp, "default");
const s2 = computeSig(TEST_SECRET, "/p1", exp, "default");
check("7. Same inputs → same sig", s1, s2);
check("7a. Sig is 64 hex chars (HMAC-SHA256)", s1.length, 64);
check("7b. Sig is hex", /^[a-f0-9]+$/.test(s1), true);

// === Test 8: Different kid produces different sig ===
const sNoKid = computeSig(TEST_SECRET, "/p1", exp, undefined);
const sWithKid = computeSig(TEST_SECRET, "/p1", exp, "v1");
check("8. kid inclusion produces different sig", sNoKid !== sWithKid, true);

// === Test 9: Different secret produces different sig ===
const s3 = computeSig("different-secret-also-32-chars-long", "/p1", exp, "default");
check("9. Different secret → different sig", s1 !== s3, true);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
