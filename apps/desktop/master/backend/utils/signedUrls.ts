// backend/shared/signedUrls.ts
// P0-2 fix: HMAC-SHA256 signed URLs for time-limited file delivery.
//
// Usage:
//   const url = signFilePath('/api/files/photos/abc123.jpg', { ttlSeconds: 3600 });
//   → '/api/files/photos/abc123.jpg?e=1781290247&s=a63a23413b296d57…'
//
//   const ok = verifySignedUrl(req);
//   → true if signature is valid AND not expired AND path matches.
//
// The signing secret is read from `SIGNED_URL_SECRET` env var. If not set,
// a derived value from `JWT_SECRET` is used as a fallback (with a startup
// warning logged). Rotation is supported via `SIGNED_URL_SECRETS` (comma-
// separated list of "kid:secret" pairs, newest first).
//
// Design notes:
//   - HMAC over "path:expires" — does NOT include the query string, so
//     callers can add their own ?w=320&h=240 style hints without breaking.
//   - Constant-time signature comparison via crypto.timingSafeEqual.
//   - Clock skew tolerance: 5 minutes (300s).
//   - Optional kid (key id) parameter for secret rotation: ?k=<kid>.
//
// Future hook (P1-1): secret rotation will write a kid-prefixed secret
// and accept any active key during verification.

import crypto from "crypto";
import { logger } from '../utils/logger';

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_TTL_SECONDS = 24 * 60 * 60; // 24 hours (sanity cap)
const CLOCK_SKEW_TOLERANCE_SEC = 5 * 60;

let cachedKeys: { kid: string; secret: string }[] | null = null;
let activeKeyId: string | null = null;

function loadKeys(): { kid: string; secret: string }[] {
    if (cachedKeys) return cachedKeys;
    const raw = process.env.SIGNED_URL_SECRETS;
    if (raw) {
        // Format: "kid1:secret1,kid2:secret2,..." — newest first
        cachedKeys = raw
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((pair) => {
                const [kid, secret] = pair.split(":");
                return { kid: kid || "default", secret };
            });
    } else {
        // Fallback: derive from JWT_SECRET (with warning)
        const secret = process.env.SIGNED_URL_SECRET || process.env.JWT_SECRET || "dev-insecure-signed-url-secret";
        if (!process.env.SIGNED_URL_SECRET && !process.env.SIGNED_URL_SECRETS) {
            logger.warn(
                "[SignedUrls] WARNING: SIGNED_URL_SECRET not set. Falling back to JWT_SECRET. " +
                "Set SIGNED_URL_SECRETS for production deployments.",
            );
        }
        cachedKeys = [{ kid: "default", secret }];
    }
    activeKeyId = cachedKeys[0]?.kid || "default";
    return cachedKeys;
}

/** Force a key reload (call after secret rotation in tests or admin endpoints). */
export function reloadSignedUrlKeys(): void {
    cachedKeys = null;
    activeKeyId = null;
}

/** Returns the active key id, used to embed ?k=<kid> in new signed URLs. */
export function getActiveKeyId(): string {
    loadKeys();
    return activeKeyId!;
}

function computeSig(secret: string, pathOnly: string, expires: number, kid?: string): string {
    const payload = kid ? `${kid}:${pathOnly}:${expires}` : `${pathOnly}:${expires}`;
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export interface SignOptions {
    ttlSeconds?: number;
    kid?: string;
}

/**
 * Sign a file path for time-limited public access. Returns the full URL
 * with `?e=<expiry>&s=<hmac>[&k=<kid>]` appended.
 *
 * @param filePath  Must be a path-only URL (no query string, no fragment).
 */
export function signFilePath(filePath: string, opts: SignOptions = {}): string {
    const keys = loadKeys();
    const kid = opts.kid || activeKeyId || "default";
    const secret = keys.find((k) => k.kid === kid)?.secret || keys[0].secret;
    const ttl = Math.min(Math.max(opts.ttlSeconds ?? DEFAULT_TTL_SECONDS, 1), MAX_TTL_SECONDS);
    const expires = Math.floor(Date.now() / 1000) + ttl;
    const sig = computeSig(secret, filePath, expires, kid);
    return `${filePath}?e=${expires}&s=${sig}&k=${kid}`;
}

export interface VerifyResult {
    valid: boolean;
    reason?: "missing_params" | "expired" | "bad_signature" | "path_mismatch" | "unknown_kid";
    expiresAt?: number;
    keyId?: string;
}

/**
 * Verify a signed URL request. Pass the request object; the function
 * extracts the path, expiry, signature, and kid from the query string,
 * then checks the signature with a constant-time compare.
 *
 * In dev mode (no env var), all valid-format signatures are accepted but
 * a warning is logged once.
 */
export function verifySignedUrl(req: { path: string; query: Record<string, any> }): VerifyResult {
    const expires = parseInt(String(req.query.e ?? ""), 10);
    const sig = String(req.query.s ?? "");
    const kid = String(req.query.k ?? activeKeyId ?? "default");
    if (!expires || !sig) {
        return { valid: false, reason: "missing_params" };
    }
    
    const keys = loadKeys();
    const key = keys.find((k) => k.kid === kid);
    if (!key) {
        return { valid: false, reason: "unknown_kid", keyId: kid };
    }
    
    const expected = computeSig(key.secret, req.path, expires, kid);
    // timingSafeEqual requires equal-length buffers
    if (sig.length !== expected.length) {
        return { valid: false, reason: "bad_signature" };
    }
    const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return { valid: false, reason: "bad_signature" };

    const now = Math.floor(Date.now() / 1000);
    if (now > expires + CLOCK_SKEW_TOLERANCE_SEC) {
        return { valid: false, reason: "expired", expiresAt: expires };
    }
    
    return { valid: true, expiresAt: expires, keyId: kid };
}

/**
 * Express middleware factory. When `SIGNED_URL_ENFORCED=true`, this rejects
 * unsigned requests with 401. Otherwise, requests are allowed but
 * `req.signedUrl` is populated for downstream use.
 */
export function signedUrlMiddleware(options: { enforce?: boolean } = {}) {
    const enforce = options.enforce ?? process.env.SIGNED_URL_ENFORCED === "true";
    return (req: any, res: any, next: any) => {
        const result = verifySignedUrl(req);
        req.signedUrl = result;
        if (enforce && !result.valid) {
            return res.status(401).json({
                error: "Invalid or expired signed URL",
                reason: result.reason,
            });
        }
        next();
    };
}
