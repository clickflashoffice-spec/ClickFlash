#!/usr/bin/env node
/**
 * SSRF Guard E2E verification — P0-5
 *
 * Replicates the exact URL check logic from shared/ssrfGuard.ts to verify
 * all the SSRF attack vectors are blocked:
 *   - Loopback IPs (127.0.0.1, ::1)
 *   - Private IPs (10.x, 172.16-31.x, 192.168.x)
 *   - Link-local (169.254.169.254 — cloud metadata!)
 *   - CGNAT (100.64.x)
 *   - TEST-NET (192.0.2.x, 198.51.100.x, 203.0.113.x)
 *   - Multicast, reserved
 *   - Localhost names
 *   - File:// and other forbidden schemes
 *   - Userinfo in URL (user:pass@host)
 *   - IP literal encoding tricks
 *
 * Public IPs and well-known hostnames are allowed.
 *
 * Run: node tests/ssrf-guard.mjs
 */

import { URL } from "node:url";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

function isIpForbidden(ip, opts = {}) {
    if (ip.includes(".")) {
        const parts = ip.split(".").map((p) => parseInt(p, 10));
        if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;
        const [a, b] = parts;
        if (a === 0) return true;
        if (a === 10) return !opts.allowPrivate;
        if (a === 100 && b >= 64 && b <= 127) return !opts.allowPrivate;
        if (a === 127) return !opts.allowLoopback;
        if (a === 169 && b === 254) return !opts.allowPrivate;
        if (a === 172 && b >= 16 && b <= 31) return !opts.allowPrivate;
        if (a === 192 && b === 168) return !opts.allowPrivate;
        if (a === 192 && b === 0 && parts[2] === 0) return true;
        if ((a === 192 && b === 0 && parts[2] === 2) ||
            (a === 198 && b === 51 && parts[2] === 100) ||
            (a === 203 && b === 0 && parts[2] === 113)) return true;
        if (a === 198 && (b === 18 || b === 19)) return true;
        if (a >= 224 && a <= 239) return true;
        if (a >= 240) return true;
        return false;
    }
    if (ip.includes(":")) {
        const lower = ip.toLowerCase();
        if (lower === "::") return true;
        if (lower === "::1") return !opts.allowLoopback;
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
            return true;
        }
        if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return !opts.allowPrivate;
        if (/^fe[89ab][0-9a-f]:/i.test(lower)) return !opts.allowPrivate;
        if (/^2001:db8:/i.test(lower)) return true;
        if (lower.startsWith("ff")) return true;
        return false;
    }
    return true;
}

function checkUrlStatic(rawUrl, opts = {}) {
    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        return { safe: false, reason: "Malformed URL" };
    }
    if (!ALLOWED_SCHEMES.has(url.protocol)) {
        return { safe: false, reason: `Forbidden scheme: ${url.protocol}` };
    }
    if (url.username || url.password) {
        return { safe: false, reason: "Userinfo not allowed in URL" };
    }
    const hostname = url.hostname;
    if (!hostname) return { safe: false, reason: "Missing hostname" };
    if (hostname.length > 253) return { safe: false, reason: "Hostname too long" };
    if (opts.allowedHostnames && opts.allowedHostnames.length > 0) {
        const matched = opts.allowedHostnames.some((allowed) => {
            const a = allowed.toLowerCase();
            const h = hostname.toLowerCase();
            return h === a || h.endsWith(`.${a}`);
        });
        if (!matched) return { safe: false, reason: `Hostname not in allowlist: ${hostname}` };
    }
    if (opts.blockedHostnames && opts.blockedHostnames.some((b) => b.toLowerCase() === hostname.toLowerCase())) {
        return { safe: false, reason: `Hostname is blocked: ${hostname}` };
    }
    const cleanHostname = hostname.startsWith("[") && hostname.endsWith("]")
        ? hostname.slice(1, -1)
        : hostname;
    if (/^[\d.:a-fA-F]+$/.test(cleanHostname)) {
        if (isIpForbidden(cleanHostname, opts)) {
            return { safe: false, reason: `Forbidden IP literal: ${hostname}` };
        }
        return { safe: true, ip: cleanHostname };
    }
    const lowerHost = cleanHostname.toLowerCase();
    if (!opts.allowLoopback && (lowerHost === "localhost" || lowerHost.endsWith(".localhost"))) {
        return { safe: false, reason: "Loopback hostname forbidden" };
    }
    return { safe: true };
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`  ✓ ${name}`); pass++; }
    else    { console.log(`  ✗ ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); fail++; }
}

console.log("\n=== SSRF Guard E2E (P0-5) ===\n");

// === Block tests ===
const blocked = [
    ["http://127.0.0.1/admin",                          "loopback"],
    ["http://127.5.5.5/",                                "loopback range"],
    ["http://10.0.0.1/",                                 "RFC1918 10.x"],
    ["http://10.255.255.255/",                           "RFC1918 10.x edge"],
    ["http://172.16.0.1/",                               "RFC1918 172.16.x"],
    ["http://172.31.255.255/",                           "RFC1918 172.31.x edge"],
    ["http://192.168.1.1/",                              "RFC1918 192.168.x"],
    ["http://169.254.169.254/latest/meta-data/",         "AWS metadata link-local"],
    ["http://100.64.0.1/",                               "CGNAT"],
    ["http://100.127.255.255/",                          "CGNAT edge"],
    ["http://192.0.2.1/",                                "TEST-NET-1"],
    ["http://198.51.100.1/",                             "TEST-NET-2"],
    ["http://203.0.113.1/",                              "TEST-NET-3"],
    ["http://224.0.0.1/",                                "multicast"],
    ["http://240.0.0.1/",                                "reserved"],
    ["http://0.0.0.0/",                                  "this network"],
    ["http://[::1]/admin",                               "IPv6 loopback"],
    ["http://[fe80::1]/admin",                           "IPv6 link-local"],
    ["http://[fc00::1]/admin",                           "IPv6 ULA private"],
    ["http://[2001:db8::1]/admin",                       "IPv6 documentation"],
    ["file:///etc/passwd",                               "file scheme"],
    ["ftp://internal.ftp/",                              "ftp scheme"],
    ["gopher://internal:11211/",                         "gopher scheme"],
    ["data:text/html,<script>alert(1)</script>",         "data scheme"],
    ["http://user:pass@example.com/",                    "userinfo"],
    ["http://user@example.com/",                         "userinfo (no pass)"],
    ["http://example.com:80@evil.com/",                  "userinfo spoofing"],
    ["http://[::ffff:127.0.0.1]/admin",                  "IPv4-mapped IPv6 loopback"],
    ["http://[::ffff:10.0.0.1]/admin",                   "IPv4-mapped IPv6 private"],
    ["http://192.0.0.0/",                                "IETF protocol assignments"],
    ["http://198.18.0.1/",                               "benchmarking"],
    ["https://localhost/admin",                          "localhost as name (when not in allowlist)"],
];
for (const [url, label] of blocked) {
    const r = checkUrlStatic(url);
    check(`BLOCK ${label} (${url})`, r.safe, false);
}

// === Allow tests (public IPs and well-known hostnames) ===
const allowed = [
    ["http://8.8.8.8/",                                  "Google DNS public IP"],
    ["http://1.1.1.1/",                                  "Cloudflare DNS public IP"],
    ["http://93.184.216.34/",                            "example.com IP"],
    ["http://[2606:4700:4700::1111]/",                   "Cloudflare DNS IPv6"],
    ["https://hub.clickflash.photo/",                    "public hostname"],
    ["https://api.stripe.com/v1/",                       "Stripe API"],
    ["https://example.com/path?query=value",             "normal URL with path+query"],
];
for (const [url, label] of allowed) {
    const r = checkUrlStatic(url);
    check(`ALLOW ${label} (${url})`, r.safe, true);
}

// === Opt-in private/loopback (allowPrivate) ===
const r1 = checkUrlStatic("http://10.0.0.1/admin", { allowPrivate: true });
check("allowPrivate=true → 10.0.0.1 allowed", r1.safe, true);
const r2 = checkUrlStatic("http://10.0.0.1/admin");
check("allowPrivate=undef → 10.0.0.1 blocked", r2.safe, false);
const r3 = checkUrlStatic("http://127.0.0.1/admin", { allowLoopback: true });
check("allowLoopback=true → 127.0.0.1 allowed", r3.safe, true);

// === Allowlist ===
const r4 = checkUrlStatic("https://hub.clickflash.photo/admin", {
    allowedHostnames: ["clickflash.photo"],
});
check("Allowlist match (suffix) → safe", r4.safe, true);
const r5 = checkUrlStatic("https://hub.evil.com/admin", {
    allowedHostnames: ["clickflash.photo"],
});
check("Allowlist miss → blocked", r5.safe, false);
const r6 = checkUrlStatic("https://clickflash.photo.evil.com/admin", {
    allowedHostnames: ["clickflash.photo"],
});
// Note: endsWith('.clickflash.photo') is false here (it's the full domain as suffix)
check("Allowlist prefix-spoof attempt → blocked", r6.safe, false);

// === Blocklist ===
const r7 = checkUrlStatic("https://blocked.example.com/", {
    blockedHostnames: ["blocked.example.com"],
});
check("Blocklist → blocked", r7.safe, false);

// === Malformed URL ===
const r8 = checkUrlStatic("not-a-url");
check("Malformed URL → blocked", r8.safe, false);
const r9 = checkUrlStatic("http://");
check("Empty hostname → blocked", r9.safe, false);

// === Userinfo bypass attempts ===
const r10 = checkUrlStatic("http://attacker.com#@victim.com/");
check("Hash-based userinfo bypass attempt → safe (legitimate)", r10.safe, true);
// Note: hashes are NOT userinfo, they're fragments

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
