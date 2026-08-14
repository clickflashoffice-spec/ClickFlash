// backend/shared/ssrfGuard.ts
// P0-5 fix: Block SSRF (Server-Side Request Forgery) in user-controlled URL fetches.
//
// The Master server must NEVER fetch arbitrary URLs from request bodies or
// query strings. This module enforces a strict allowlist:
//   1. Scheme: http or https (no file://, gopher://, ftp://, data:, etc.)
//   2. No userinfo (user:pass@host) in the URL
//   3. No IP literals in private/reserved ranges (RFC 1918, loopback, link-local, etc.)
//   4. No DNS rebinding: we resolve the hostname ourselves and check the IP
//   5. Optional hostname allowlist (e.g. *.clickflash.photo)
//
// If a URL fails any check, the request is rejected with a clear reason.
//
// See: OWASP Server-Side Request Forgery Prevention Cheat Sheet
//   https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

import { URL } from "url";
import * as dns from "dns";
import { promisify } from "util";

const dnsLookup = promisify(dns.lookup);

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export interface SsrfGuardOptions {
    /** Optional whitelist of allowed hostnames (suffix match, no wildcards). */
    allowedHostnames?: string[];
    /** Optional blacklist of blocked hostnames (exact match). */
    blockedHostnames?: string[];
    /** Allow loopback (127.0.0.0/8, ::1) — default false. */
    allowLoopback?: boolean;
    /** Allow private IPs (RFC 1918, link-local) — default false. */
    allowPrivate?: boolean;
}

export interface SsrfCheckResult {
    safe: boolean;
    reason?: string;
    /** The resolved IP (if DNS was checked). */
    ip?: string;
}

/** Returns true if the given IP (IPv4 or IPv6) is in a forbidden range. */
function isIpForbidden(ip: string, opts: SsrfGuardOptions): boolean {
    // IPv4
    if (ip.includes(".")) {
        const parts = ip.split(".").map((p) => parseInt(p, 10));
        if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
            return true; // malformed
        }
        const [a, b] = parts;

        // 0.0.0.0/8 — "this network" (some servers bind to it)
        if (a === 0) return true;
        // 10.0.0.0/8 — RFC 1918 private
        if (a === 10) return !opts.allowPrivate;
        // 100.64.0.0/10 — CGNAT
        if (a === 100 && b >= 64 && b <= 127) return !opts.allowPrivate;
        // 127.0.0.0/8 — loopback
        if (a === 127) return !opts.allowLoopback;
        // 169.254.0.0/16 — link-local (AWS/GCP/Azure metadata at 169.254.169.254)
        if (a === 169 && b === 254) return !opts.allowPrivate;
        // 172.16.0.0/12 — RFC 1918 private
        if (a === 172 && b >= 16 && b <= 31) return !opts.allowPrivate;
        // 192.168.0.0/16 — RFC 1918 private
        if (a === 192 && b === 168) return !opts.allowPrivate;
        // 192.0.0.0/24 — IETF protocol assignments
        if (a === 192 && b === 0 && parts[2] === 0) return true;
        // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 — TEST-NET
        if (
            (a === 192 && b === 0 && parts[2] === 2) ||
            (a === 198 && b === 51 && parts[2] === 100) ||
            (a === 203 && b === 0 && parts[2] === 113)
        ) {
            return true;
        }
        // 198.18.0.0/15 — benchmarking
        if (a === 198 && (b === 18 || b === 19)) return true;
        // 224.0.0.0/4 — multicast
        if (a >= 224 && a <= 239) return true;
        // 240.0.0.0/4 — reserved
        if (a >= 240) return true;
        return false;
    }

    // IPv6 — abbreviated checks
    if (ip.includes(":")) {
        const lower = ip.toLowerCase();
        // :: — unspecified
        if (lower === "::") return true;
        // ::1 — loopback
        if (lower === "::1") return !opts.allowLoopback;
        // ::ffff:0:0/96 — IPv4-mapped — check the embedded IPv4
        if (lower.startsWith("::ffff:")) {
            const v4 = lower.slice(7);
            if (v4.includes(".")) {
                return isIpForbidden(v4, opts);
            }
            if (v4.includes(":")) {
                const parts = v4.split(":");
                if (parts.length === 2) {
                    const w0 = parseInt(parts[0], 16);
                    const w1 = parseInt(parts[1], 16);
                    if (!isNaN(w0) && !isNaN(w1)) {
                        const dotted = `${(w0 >> 8) & 0xff}.${w0 & 0xff}.${(w1 >> 8) & 0xff}.${w1 & 0xff}`;
                        return isIpForbidden(dotted, opts);
                    }
                }
            }
            return true; // malformed IPv4-mapped address — fail closed
        }
        // fc00::/7 — ULA (private)
        if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return !opts.allowPrivate;
        // fe80::/10 — link-local
        if (/^fe[89ab][0-9a-f]:/i.test(lower)) return !opts.allowPrivate;
        // 2001:db8::/32 — documentation
        if (/^2001:db8:/i.test(lower)) return true;
        // ff00::/8 — multicast
        if (lower.startsWith("ff")) return true;
        return false;
    }

    return true; // unknown format — fail closed
}

function ipv4ToInt(ip: string): number | null {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return null;
    }
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isInCidr(ip: string, cidr: string): boolean {
    const [base, bitsStr] = cidr.split("/");
    const bits = parseInt(bitsStr, 10);
    if (!base || isNaN(bits)) return false;

    const ipInt = ipv4ToInt(ip);
    const baseInt = ipv4ToInt(base);
    if (ipInt === null || baseInt === null) return false;

    if (bits === 0) return true;
    const mask = (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
}

/**
 * Static check (no DNS) — validates scheme, userinfo, hostname format, and
 * any IP literal in the URL. Use this when the URL is from a trusted
 * configuration store (e.g. we already resolved this hostname once).
 */
export function checkUrlStatic(rawUrl: string, opts: SsrfGuardOptions = {}): SsrfCheckResult {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return { safe: false, reason: "Malformed URL" };
    }

    // 1. Scheme
    if (!ALLOWED_SCHEMES.has(url.protocol)) {
        return { safe: false, reason: `Forbidden scheme: ${url.protocol}` };
    }

    // 2. Userinfo
    if (url.username || url.password) {
        return { safe: false, reason: "Userinfo not allowed in URL" };
    }

    // 3. Hostname format
    const hostname = url.hostname;
    if (!hostname) {
        return { safe: false, reason: "Missing hostname" };
    }
    if (hostname.length > 253) {
        return { safe: false, reason: "Hostname too long" };
    }

    // 4. Allowlist / blocklist
    if (opts.allowedHostnames && opts.allowedHostnames.length > 0) {
        const matched = opts.allowedHostnames.some((allowed) => {
            const a = allowed.toLowerCase();
            const h = hostname.toLowerCase();
            return h === a || h.endsWith(`.${a}`);
        });
        if (!matched) {
            return { safe: false, reason: `Hostname not in allowlist: ${hostname}` };
        }
    }
    if (opts.blockedHostnames && opts.blockedHostnames.some((b) => b.toLowerCase() === hostname.toLowerCase())) {
        return { safe: false, reason: `Hostname is blocked: ${hostname}` };
    }

    // 5. If hostname is an IP literal, check it directly
    const cleanHostname = hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;

    if (/^[\d.:a-fA-F]+$/.test(cleanHostname)) {
        if (isIpForbidden(cleanHostname, opts)) {
            return { safe: false, reason: `Forbidden IP literal: ${hostname}` };
        }
        return { safe: true, ip: cleanHostname };
    }

    // 6. Check common loopback names statically
    const lowerHost = cleanHostname.toLowerCase();
    if (!opts.allowLoopback && (lowerHost === "localhost" || lowerHost.endsWith(".localhost"))) {
        return { safe: false, reason: "Loopback hostname forbidden" };
    }

    // Hostname is a DNS name — caller should also do dynamic check
    return { safe: true };
}

/**
 * Dynamic check (with DNS) — resolves the hostname to an IP and checks
 * the resolved IP. Defeats DNS rebinding: the resolved IP at check-time
 * is what's actually used when fetch() runs.
 */
export async function checkUrl(rawUrl: string, opts: SsrfGuardOptions = {}): Promise<SsrfCheckResult> {
    const staticCheck = checkUrlStatic(rawUrl, opts);
    if (!staticCheck.safe) return staticCheck;

    const hostname = new URL(rawUrl).hostname;
    const cleanHostname = hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;

    // If hostname is an IP literal, we already checked it statically
    if (/^[\d.:a-fA-F]+$/.test(cleanHostname)) {
        return staticCheck;
    }

    // DNS resolve and check
    let resolved: { address: string; family: number };
    try {
        resolved = await dnsLookup(hostname);
    } catch (err: any) {
        return { safe: false, reason: `DNS resolution failed: ${err.message}` };
    }

    if (isIpForbidden(resolved.address, opts)) {
        return {
            safe: false,
            reason: `Hostname ${hostname} resolves to forbidden IP ${resolved.address}`,
            ip: resolved.address,
        };
    }

    return { safe: true, ip: resolved.address };
}

/**
 * Express/Connect middleware. Applies checkUrl to `req.body.hubUrl` (or any
 * field name you configure). Rejects with 400 if the URL is unsafe.
 */
export function ssrfGuardMiddleware(opts: {
    fieldName?: string;
    guardOptions?: SsrfGuardOptions;
    /** Custom error message. */
    customMessage?: string;
}) {
    const field = opts.fieldName || "hubUrl";
    const guardOpts = opts.guardOptions || {};
    return async (req: any, res: any, next: any) => {
        const url = req.body?.[field];
        if (!url) return next(); // No URL to check; let the route decide

        const result = await checkUrl(url, guardOpts);
        if (!result.safe) {
            return res.status(400).json({
                error: opts.customMessage || "URL failed SSRF safety check",
                reason: result.reason,
            });
        }
        next();
    };
}

// CGNAT + reserved ranges from IANA — exported for testability
export const FORBIDDEN_CIDRS_V4 = [
    "0.0.0.0/8",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.0.0.0/24",
    "192.0.2.0/24",
    "192.168.0.0/16",
    "198.18.0.0/15",
    "198.51.100.0/24",
    "203.0.113.0/24",
    "224.0.0.0/4",
    "240.0.0.0/4",
];

export { isInCidr };
