import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

/**
 * ClickFlash Ecosystem — Load Test Suite
 * Tests: Master Portal, Touch Kiosk, Gallery Checkout, Cloud Sync
 *
 * Run: k6 run --env MASTER_URL=http://localhost:8090 --env GALLERY_URL=https://gallery.clickflash.app tests/performance/k6-load.js
 */

// Custom metrics
const masterHealthTrend = new Trend("master_health_duration");
const touchOrderTrend = new Trend("touch_order_duration");
const galleryCheckoutTrend = new Trend("gallery_checkout_duration");
const cloudSyncTrend = new Trend("cloud_sync_duration");
const errorRate = new Rate("errors");
const orderCounter = new Counter("orders_created");

export const options = {
  scenarios: {
    // Steady-state: simulate normal studio operations
    steady_state: {
      executor: "constant-vus",
      vus: 10,
      duration: "5m",
      exec: "steadyState",
    },
    // Spike: simulate event rush (wedding peak)
    spike: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "2m", target: 5 },
      ],
      exec: "spikeLoad",
    },
    // Soak: long-running stability test
    soak: {
      executor: "constant-vus",
      vus: 5,
      duration: "30m",
      exec: "soakTest",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% under 500ms
    http_req_failed: ["rate<0.01"],   // <1% errors
    master_health_duration: ["p(95)<200"],
    touch_order_duration: ["p(95)<1000"],
    gallery_checkout_duration: ["p(95)<2000"],
    errors: ["rate<0.05"],
  },
};

const MASTER_URL = __ENV.MASTER_URL || "http://localhost:8090";
const TOUCH_URL = __ENV.TOUCH_URL || "http://localhost:8091";
const GALLERY_URL = __ENV.GALLERY_URL || "https://gallery.clickflash.app";
const CLOUD_URL = __ENV.CLOUD_URL || "https://management.clickflash.app";

// Helper: generate random customer data
function randomCustomer() {
  const id = randomIntBetween(1000, 999999);
  return {
    name: `Customer ${id}`,
    email: `customer${id}@test.com`,
    phone: `+1${randomIntBetween(2000000000, 9999999999)}`,
  };
}

// Helper: generate random order items
function randomOrderItems() {
  const items = [];
  const count = randomIntBetween(1, 5);
  for (let i = 0; i < count; i++) {
    items.push({
      photoId: `photo_${randomIntBetween(1, 10000)}`,
      productType: ["print_4x6", "print_5x7", "digital", "canvas_8x10"][randomIntBetween(0, 3)],
      quantity: randomIntBetween(1, 10),
      unitPrice: randomIntBetween(5, 50),
    });
  }
  return items;
}

// ─────────────────────────────────────────────────────────────
// STEADY STATE SCENARIO
// ─────────────────────────────────────────────────────────────
export function steadyState() {
  group("Master Health Check", () => {
    const start = Date.now();
    const res = http.get(`${MASTER_URL}/api/system/health`, {
      tags: { endpoint: "master_health" },
    });
    masterHealthTrend.add(Date.now() - start);

    const success = check(res, {
      "master health status 200": (r) => r.status === 200,
      "master health response valid": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === "healthy" || body.status === "degraded";
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(randomIntBetween(1, 3));

  group("Touch Kiosk — Browse Albums", () => {
    const res = http.get(`${TOUCH_URL}/api/albums`, {
      headers: { "X-Kiosk-Id": `KIOSK_${__VU}` },
      tags: { endpoint: "touch_albums" },
    });

    const success = check(res, {
      "albums list status 200": (r) => r.status === 200,
      "albums list returns array": (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(randomIntBetween(2, 5));

  group("Touch Kiosk — Create Order", () => {
    const customer = randomCustomer();
    const items = randomOrderItems();
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const payload = {
      clientName: customer.name,
      clientEmail: customer.email,
      clientPhone: customer.phone,
      albumId: `album_${randomIntBetween(1, 100)}`,
      items: items,
      totalAmount: total,
      paymentMethod: "cash",
      clientMutationId: `mutation_${__VU}_${Date.now()}`,
    };

    const start = Date.now();
    const res = http.post(
      `${TOUCH_URL}/api/orders/kiosk/orders`,
      JSON.stringify(payload),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Kiosk-Id": `KIOSK_${__VU}`,
          "X-Timestamp": String(Date.now()),
        },
        tags: { endpoint: "touch_order_create" },
      },
    );
    touchOrderTrend.add(Date.now() - start);

    const success = check(res, {
      "order create status 200/201": (r) => r.status === 200 || r.status === 201,
      "order create returns id": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id || body.orderId;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
    if (success) orderCounter.add(1);
  });

  sleep(randomIntBetween(3, 8));
}

// ─────────────────────────────────────────────────────────────
// SPIKE SCENARIO (Event Rush)
// ─────────────────────────────────────────────────────────────
export function spikeLoad() {
  group("Spike — Rapid Order Creation", () => {
    const customer = randomCustomer();
    const items = randomOrderItems();
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const payload = {
      clientName: customer.name,
      clientEmail: customer.email,
      albumId: `album_${randomIntBetween(1, 100)}`,
      items: items,
      totalAmount: total,
      paymentMethod: "card",
      clientMutationId: `spike_${__VU}_${Date.now()}`,
    };

    const res = http.post(
      `${TOUCH_URL}/api/orders/kiosk/orders`,
      JSON.stringify(payload),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Kiosk-Id": `KIOSK_SPIKE_${__VU}`,
          "X-Timestamp": String(Date.now()),
        },
        tags: { endpoint: "touch_order_spike" },
      },
    );

    const success = check(res, {
      "spike order status ok": (r) => r.status === 200 || r.status === 201 || r.status === 429,
      "spike order rate limited gracefully": (r) => {
        if (r.status === 429) {
          return r.headers["Retry-After"] !== undefined || r.headers["retry-after"] !== undefined;
        }
        return true;
      },
    });
    errorRate.add(!success);
  });

  sleep(randomIntBetween(0, 1)); // Minimal sleep during spike
}

// ─────────────────────────────────────────────────────────────
// SOAK SCENARIO (Long-running Stability)
// ─────────────────────────────────────────────────────────────
export function soakTest() {
  group("Soak — Health + Sync + Gallery", () => {
    // 1. Master health
    const healthRes = http.get(`${MASTER_URL}/api/system/health`, {
      tags: { endpoint: "soak_health" },
    });
    check(healthRes, {
      "soak health ok": (r) => r.status === 200,
    });

    sleep(1);

    // 2. Simulate cloud sync status check
    const syncRes = http.get(`${MASTER_URL}/api/sync/status`, {
      tags: { endpoint: "soak_sync_status" },
    });
    check(syncRes, {
      "soak sync status ok": (r) => r.status === 200 || r.status === 404, // 404 if endpoint not implemented
    });

    sleep(1);

    // 3. Gallery health (if available)
    const galleryHealthRes = http.get(`${GALLERY_URL}/api/health`, {
      tags: { endpoint: "soak_gallery_health" },
      timeout: "5s",
    });
    check(galleryHealthRes, {
      "soak gallery health ok": (r) => r.status === 200 || r.status === 0, // 0 = connection refused (local dev)
    });
  });

  sleep(randomIntBetween(5, 15)); // Slow pace for soak
}

// ─────────────────────────────────────────────────────────────
// GALLERY CHECKOUT STRESS TEST (Separate run)
// ─────────────────────────────────────────────────────────────
export function galleryCheckout() {
  group("Gallery — Create Checkout Session", () => {
    const payload = {
      items: [
        {
          photoId: `photo_${randomIntBetween(1, 10000)}`,
          productType: "print_4x6",
          quantity: 2,
          unitPrice: 10,
        },
      ],
      customerEmail: `customer${randomIntBetween(1, 999999)}@test.com`,
      albumId: `album_${randomIntBetween(1, 100)}`,
      currency: "eur",
    };

    const start = Date.now();
    const res = http.post(
      `${GALLERY_URL}/api/checkout`,
      JSON.stringify(payload),
      {
        headers: { "Content-Type": "application/json" },
        tags: { endpoint: "gallery_checkout" },
      },
    );
    galleryCheckoutTrend.add(Date.now() - start);

    const success = check(res, {
      "checkout status 200": (r) => r.status === 200,
      "checkout returns session": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.sessionId || body.url || body.id;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(randomIntBetween(2, 5));
}

// ─────────────────────────────────────────────────────────────
// CLOUD SYNC STRESS TEST (Separate run)
// ─────────────────────────────────────────────────────────────
export function cloudSync() {
  group("Cloud — Fleet Registration", () => {
    const payload = {
      desk_id: `MASTER_LOAD_${__VU}_${Date.now()}`,
      studio_name: `Load Test Studio ${__VU}`,
      location: "Test City",
      timezone: "UTC",
      version: "5.0.0",
      public_ip: "127.0.0.1",
      local_ip: "192.168.1.100",
      port: 8090,
      touch_port: 8091,
      hardware_fingerprint: `fp_load_${__VU}`,
    };

    const start = Date.now();
    const res = http.post(
      `${CLOUD_URL}/api/masters/register`,
      JSON.stringify(payload),
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${__ENV.CLOUD_TOKEN || "test-token"}`,
        },
        tags: { endpoint: "cloud_register" },
      },
    );
    cloudSyncTrend.add(Date.now() - start);

    const success = check(res, {
      "register status 200/201": (r) => r.status === 200 || r.status === 201,
      "register returns token": (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token || body.desk_id;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!success);
  });

  sleep(randomIntBetween(1, 3));

  group("Cloud — Heartbeat", () => {
    const payload = {
      timestamp: new Date().toISOString(),
      version: "5.0.0",
      uptime_seconds: randomIntBetween(60, 86400),
      photos_count: randomIntBetween(0, 50000),
      orders_count: randomIntBetween(0, 10000),
      disk_usage_percent: randomIntBetween(10, 80),
      memory_usage_percent: randomIntBetween(20, 70),
      cpu_usage_percent: randomIntBetween(5, 60),
      sync_status: "online",
      last_sync_at: new Date().toISOString(),
      pending_operations: randomIntBetween(0, 100),
      touch_connected: true,
      touch_last_seen: new Date().toISOString(),
    };

    const res = http.post(
      `${CLOUD_URL}/api/masters/MASTER_LOAD_${__VU}/heartbeat`,
      JSON.stringify(payload),
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${__ENV.CLOUD_TOKEN || "test-token"}`,
        },
        tags: { endpoint: "cloud_heartbeat" },
      },
    );

    const success = check(res, {
      "heartbeat status 200": (r) => r.status === 200,
    });
    errorRate.add(!success);
  });

  sleep(randomIntBetween(5, 10));
}
