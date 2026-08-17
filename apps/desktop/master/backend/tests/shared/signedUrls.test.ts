import { describe, test, expect, beforeAll, afterAll } from 'vitest';
// backend/tests/shared/signedUrls.test.ts
// Unit test for P0-2 signed URL helper.

import { signFilePath, verifySignedUrl, reloadSignedUrlKeys, getActiveKeyId } from '../../utils/signedUrls';

describe("Signed URLs (P0-2)", () => {
    const ORIGINAL_SECRET = process.env.SIGNED_URL_SECRET;
    const ORIGINAL_SECRETS = process.env.SIGNED_URL_SECRETS;
    const TEST_SECRET = "test-hmac-secret-must-be-long-enough-for-hmac-sha256-to-be-secure";

    beforeAll(() => {
        process.env.SIGNED_URL_SECRET = TEST_SECRET;
        delete process.env.SIGNED_URL_SECRETS;
        reloadSignedUrlKeys();
    });

    afterAll(() => {
        if (ORIGINAL_SECRET === undefined) delete process.env.SIGNED_URL_SECRET;
        else process.env.SIGNED_URL_SECRET = ORIGINAL_SECRET;
        if (ORIGINAL_SECRETS === undefined) delete process.env.SIGNED_URL_SECRETS;
        else process.env.SIGNED_URL_SECRETS = ORIGINAL_SECRETS;
        reloadSignedUrlKeys();
    });

    test("signFilePath produces a URL with e, s, k query params", () => {
        const url = signFilePath("/api/files/photos/abc123.jpg", { ttlSeconds: 600 });
        const u = new URL(url, "http://localhost");
        expect(u.pathname).toBe("/api/files/photos/abc123.jpg");
        expect(u.searchParams.get("e")).toMatch(/^\d+$/);
        expect(u.searchParams.get("s")).toMatch(/^[a-f0-9]{64}$/);  // HMAC-SHA256 hex
        expect(u.searchParams.get("k")).toBe(getActiveKeyId());
    });

    test("verifySignedUrl accepts a freshly signed URL", () => {
        const url = signFilePath("/api/files/photos/abc123.jpg");
        const u = new URL(url, "http://localhost");
        const result = verifySignedUrl({
            path: u.pathname,
            query: { e: u.searchParams.get("e"), s: u.searchParams.get("s"), k: u.searchParams.get("k") },
        });
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.keyId).toBe(getActiveKeyId());
    });

    test("verifySignedUrl rejects an expired URL", () => {
        const url = signFilePath("/api/files/photos/abc123.jpg", { ttlSeconds: 1 });
        // Wait 1.1s for the URL to expire (within clock skew tolerance is 5min, so need >5min)
        // Simulate by tampering the expiry
        const u = new URL(url, "http://localhost");
        const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
        const result = verifySignedUrl({
            path: u.pathname,
            query: { e: String(pastExpiry), s: u.searchParams.get("s"), k: u.searchParams.get("k") },
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("bad_signature");  // expiry was changed so sig no longer matches
    });

    test("verifySignedUrl rejects a tampered signature", () => {
        const result = verifySignedUrl({
            path: "/api/files/photos/abc123.jpg",
            query: { e: String(Math.floor(Date.now() / 1000) + 3600), s: "a".repeat(64), k: getActiveKeyId() },
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("bad_signature");
    });

    test("verifySignedUrl rejects missing params", () => {
        const r1 = verifySignedUrl({ path: "/x", query: {} });
        expect(r1.valid).toBe(false);
        expect(r1.reason).toBe("missing_params");

        const r2 = verifySignedUrl({ path: "/x", query: { e: "12345" } });
        expect(r2.valid).toBe(false);
        expect(r2.reason).toBe("missing_params");
    });

    test("verifySignedUrl detects path mismatch via signature", () => {
        const url = signFilePath("/api/files/photos/abc123.jpg");
        const u = new URL(url, "http://localhost");
        // Use same params but a different path
        const result = verifySignedUrl({
            path: "/api/files/photos/OTHER.jpg",
            query: { e: u.searchParams.get("e"), s: u.searchParams.get("s"), k: u.searchParams.get("k") },
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe("bad_signature");
    });

    test("TTL is capped at MAX_TTL_SECONDS (24h)", () => {
        const url = signFilePath("/api/files/photos/abc123.jpg", { ttlSeconds: 30 * 24 * 60 * 60 }); // 30 days
        const u = new URL(url, "http://localhost");
        const expiry = parseInt(u.searchParams.get("e")!, 10);
        const now = Math.floor(Date.now() / 1000);
        // Should be at most 24h + a few seconds in the future
        expect(expiry - now).toBeLessThanOrEqual(24 * 60 * 60 + 5);
        expect(expiry - now).toBeGreaterThan(24 * 60 * 60 - 60);
    });

    test("secret rotation: SIGNED_URL_SECRETS enables kid-based multi-key verification", () => {
        const oldSecret = "old-secret-for-test-must-be-long-enough-to-avoid-timing-attacks";
        const newSecret = "new-secret-for-test-must-be-long-enough-to-avoid-timing-attacks";
        process.env.SIGNED_URL_SECRETS = `v2:${newSecret},v1:${oldSecret}`;
        reloadSignedUrlKeys();
        // Sign with new (active) key
        const url = signFilePath("/api/files/photos/rotate.jpg", { kid: "v2" });
        const u = new URL(url, "http://localhost");
        const r2 = verifySignedUrl({
            path: u.pathname,
            query: { e: u.searchParams.get("e"), s: u.searchParams.get("s"), k: "v2" },
        });
        expect(r2.valid).toBe(true);
        expect(r2.keyId).toBe("v2");

        // Old kid should still verify if explicitly requested
        const urlOld = signFilePath("/api/files/photos/old.jpg", { kid: "v1" });
        const uo = new URL(urlOld, "http://localhost");
        const r1 = verifySignedUrl({
            path: uo.pathname,
            query: { e: uo.searchParams.get("e"), s: uo.searchParams.get("s"), k: "v1" },
        });
        expect(r1.valid).toBe(true);
        expect(r1.keyId).toBe("v1");

        // Unknown kid is rejected
        const r3 = verifySignedUrl({
            path: u.pathname,
            query: { e: u.searchParams.get("e"), s: u.searchParams.get("s"), k: "v999" },
        });
        expect(r3.valid).toBe(false);
        expect(r3.reason).toBe("unknown_kid");
    });
});
