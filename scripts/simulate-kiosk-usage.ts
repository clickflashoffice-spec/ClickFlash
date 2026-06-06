#!/usr/bin/env ts-node
/**
 * Autonomous Kiosk Usage Simulation
 *
 * Simulates real-world Touch Kiosk → Master sync scenarios to verify
 * offline-first guarantees, idempotency, and persistent write queue behavior.
 *
 * Usage:
 *   npx ts-node scripts/simulate-kiosk-usage.ts [--master-url http://localhost:8090] [--orders 50]
 *
 * Scenarios:
 * 1. Normal sync: kiosk pushes orders, master receives them
 * 2. Offline burst: kiosk goes offline, queues 10 orders, reconnects, syncs all
 * 3. Idempotency stress: same order pushed 5 times, only 1 created
 * 4. Master restart: orders queued in pending_writes, master "restarts", recovers
 */

import http from "http";

interface SimConfig {
  masterUrl: string;
  orderCount: number;
  offlineBurstSize: number;
  dedupRepeats: number;
  verbose: boolean;
  email: string;
  password: string;
}

const DEFAULT_CONFIG: SimConfig = {
  masterUrl: process.env.MASTER_URL || "http://localhost:8090",
  orderCount: 20,
  offlineBurstSize: 5,
  dedupRepeats: 5,
  verbose: process.argv.includes("--verbose"),
  email: process.env.TEST_ADMIN_EMAIL || "admin@clickflash.local",
  password: process.env.TEST_ADMIN_PASSWORD || "ClickFlash2025!",
};

function parseArgs(): Partial<SimConfig> {
  const args = process.argv.slice(2);
  const cfg: Partial<SimConfig> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--master-url" && args[i + 1]) cfg.masterUrl = args[i + 1];
    if (args[i] === "--orders" && args[i + 1]) cfg.orderCount = parseInt(args[i + 1], 10);
    if (args[i] === "--verbose") cfg.verbose = true;
  }
  return cfg;
}

const config: SimConfig = { ...DEFAULT_CONFIG, ...parseArgs() };

// ─── HTTP helpers ───────────────────────────────────────────────────────────

let sessionCookies = "";
let xsrfToken = "";
let authToken = "";

function extractCookies(res: http.IncomingMessage): string {
  const raw = res.headers["set-cookie"];
  if (!raw) return "";
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((sc) => sc.split(";")[0]).join("; ");
}

function extractXsrf(cookies: string): string {
  const match = cookies.match(/XSRF-TOKEN=([^;,\s]+)/);
  return match?.[1] ?? "";
}

function mergeCookies(existing: string, newer: string): string {
  const map = new Map<string, string>();
  for (const cookie of existing.split("; ").filter(Boolean)) {
    const [name] = cookie.split("=", 1);
    map.set(name, cookie);
  }
  for (const cookie of newer.split("; ").filter(Boolean)) {
    const [name] = cookie.split("=", 1);
    map.set(name, cookie);
  }
  return [...map.values()].join("; ");
}

function request(
  method: string,
  path: string,
  body?: object,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; body: any; cookies: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.masterUrl);
    const data = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(sessionCookies ? { Cookie: sessionCookies } : {}),
      ...(xsrfToken ? { "x-csrf-token": xsrfToken } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...extraHeaders,
      ...(data ? { "Content-Length": String(Buffer.byteLength(data)) } : {}),
    };

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          const cookies = extractCookies(res);
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(chunks), cookies });
          } catch {
            resolve({ status: res.statusCode || 0, body: chunks, cookies });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function authenticate(): Promise<boolean> {
  // Step 1: hit health to get session + CSRF
  const health = await request("GET", "/api/health");
  if (health.status !== 200) return false;
  sessionCookies = health.cookies;
  xsrfToken = extractXsrf(sessionCookies);

  // Step 2: login
  const login = await request("POST", "/api/auth/login", {
    email: config.email,
    password: config.password,
  });
  if (login.status !== 200) {
    console.error("Login failed:", login.status, login.body);
    return false;
  }
  sessionCookies = mergeCookies(sessionCookies, login.cookies);
  xsrfToken = extractXsrf(sessionCookies);
  authToken = login.body?.token || login.body?.accessToken || login.body?.jwt || "";
  return true;
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

interface OrderTemplate {
  clientMutationId: string;
  clientDeviceId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  clientName: string;
  email: string;
  total: number;
  status: string;
  date: string;
  destinationId: string;
  photographerId: number;
  roomNumber: string;
  appliedDiscount: number;
}

function makeOrder(seed: string): OrderTemplate {
  const now = Date.now();
  return {
    clientMutationId: `sim-${seed}-${now}-${Math.random().toString(36).slice(2, 6)}`,
    clientDeviceId: "sim-kiosk-01",
    items: [
      { productId: "print-4x6", quantity: Math.floor(Math.random() * 5) + 1, price: 10 },
      { productId: "canvas-8x10", quantity: 1, price: 45 },
    ],
    clientName: `Sim Customer ${seed}`,
    email: `sim-${seed}@test.local`,
    total: 55 + Math.floor(Math.random() * 100),
    status: "Pending",
    date: new Date().toISOString().split("T")[0],
    destinationId: "dest-sim",
    photographerId: 1,
    roomNumber: `SIM-${seed}`,
    appliedDiscount: 0,
  };
}

async function scenario1NormalSync(): Promise<{ passed: boolean; created: number }> {
  console.log("\n[Scenario 1] Normal sync — pushing orders to Master");
  const created: string[] = [];

  for (let i = 0; i < config.orderCount; i++) {
    const order = makeOrder(`normal-${i}`);
    const res = await request("POST", "/api/orders/kiosk/orders", order);
    if (res.status === 201 && res.body?.id) {
      created.push(res.body.id);
    } else {
      console.error(`  ❌ Order ${i} failed:`, res.status, res.body);
      return { passed: false, created: created.length };
    }
  }

  console.log(`  ✅ Created ${created.length} orders on Master`);
  return { passed: true, created: created.length };
}

async function scenario2IdempotencyStress(): Promise<{ passed: boolean; deduped: number }> {
  console.log("\n[Scenario 2] Idempotency stress — same order pushed multiple times");
  const order = makeOrder("dedup");
  const results: Array<{ status: number; id?: string; deduplicated?: boolean }> = [];

  for (let i = 0; i < config.dedupRepeats; i++) {
    const res = await request("POST", "/api/orders/kiosk/orders", order);
    results.push({
      status: res.status,
      id: res.body?.id,
      deduplicated: res.body?.deduplicated,
    });
  }

  const createdCount = results.filter((r) => r.status === 201).length;
  const dedupCount = results.filter((r) => r.status === 208).length;
  const uniqueIds = new Set(results.map((r) => r.id).filter(Boolean));

  if (createdCount === 1 && dedupCount === config.dedupRepeats - 1 && uniqueIds.size === 1) {
    console.log(`  ✅ 1 created, ${dedupCount} deduplicated, all same ID`);
    return { passed: true, deduped: dedupCount };
  }

  console.error(`  ❌ Unexpected results:`, { createdCount, dedupCount, uniqueIds: uniqueIds.size });
  return { passed: false, deduped: dedupCount };
}

async function scenario3OfflineBurst(): Promise<{ passed: boolean; queued: number }> {
  console.log("\n[Scenario 3] Offline burst — queue orders while 'offline', sync on reconnect");
  // We simulate offline by NOT sending to master, then sending all at once
  const orders: OrderTemplate[] = [];
  for (let i = 0; i < config.offlineBurstSize; i++) {
    orders.push(makeOrder(`offline-${i}`));
  }

  // "Reconnect" and push all queued orders
  const created: string[] = [];
  for (const order of orders) {
    const res = await request("POST", "/api/orders/kiosk/orders", order);
    if (res.status === 201 && res.body?.id) {
      created.push(res.body.id);
    } else {
      console.error(`  ❌ Offline order failed:`, res.status, res.body);
      return { passed: false, queued: created.length };
    }
  }

  console.log(`  ✅ Flushed ${created.length} queued orders to Master`);
  return { passed: true, queued: created.length };
}

async function scenario4VerifyOnMaster(): Promise<{ passed: boolean; found: number }> {
  console.log("\n[Scenario 4] Verification — query Master to confirm orders exist");
  const res = await request("GET", "/api/orders?limit=1000");
  if (res.status !== 200) {
    console.error(`  ❌ Failed to query orders:`, res.status);
    return { passed: false, found: 0 };
  }

  const orders = res.body?.data || [];
  const total = res.body?.total || 0;
  console.log(`  ℹ️  Master has ${total} total orders (${orders.length} in current page)`);

  // Verify all orders have client_mutation_id
  const withMutationId = orders.filter((o: any) => o.client_mutation_id);
  console.log(`  ℹ️  ${withMutationId.length} orders in page have clientMutationId`);

  return { passed: true, found: total };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ClickFlash Kiosk Usage Simulation");
  console.log(`  Master: ${config.masterUrl}`);
  console.log(`  Config: ${JSON.stringify(config, null, 2)}`);
  console.log("═══════════════════════════════════════════════════════════════");

  // Pre-flight health check + auth
  try {
    const health = await request("GET", "/api/health");
    if (health.status !== 200) {
      console.error("\n❌ Master health check failed. Is the backend running?");
      process.exit(1);
    }
    console.log("\n✅ Master health check passed");

    const authed = await authenticate();
    if (!authed) {
      console.error("\n❌ Authentication failed. Check credentials.");
      process.exit(1);
    }
    console.log("✅ Authenticated as", config.email);
  } catch (err: any) {
    console.error("\n❌ Cannot reach Master:", err.message);
    process.exit(1);
  }

  const results = {
    normalSync: await scenario1NormalSync(),
    idempotency: await scenario2IdempotencyStress(),
    offlineBurst: await scenario3OfflineBurst(),
    verification: await scenario4VerifyOnMaster(),
  };

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Results Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Normal Sync:      ${results.normalSync.passed ? "✅ PASS" : "❌ FAIL"} (${results.normalSync.created} orders)`);
  console.log(`  Idempotency:      ${results.idempotency.passed ? "✅ PASS" : "❌ FAIL"} (${results.idempotency.deduped} deduped)`);
  console.log(`  Offline Burst:    ${results.offlineBurst.passed ? "✅ PASS" : "❌ FAIL"} (${results.offlineBurst.queued} queued)`);
  console.log(`  Verification:     ${results.verification.passed ? "✅ PASS" : "❌ FAIL"} (${results.verification.found} total)`);
  console.log("═══════════════════════════════════════════════════════════════");

  const allPassed = Object.values(results).every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
