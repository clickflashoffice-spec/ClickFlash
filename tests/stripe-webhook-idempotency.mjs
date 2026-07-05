#!/usr/bin/env node
/**
 * Stripe Webhook Idempotency E2E verification — P0-3
 *
 * Simulates the exact idempotency guard the Gallery webhook uses:
 *   1. INSERT into webhook_events with stripe_event_id (UNIQUE)
 *   2. If UNIQUE violation → event was already processed, return 200
 *   3. Otherwise process the event normally
 *
 * Uses node:sqlite to simulate the Cloudflare D1 binding (same SQL).
 *
 * Run: node tests/stripe-webhook-idempotency.mjs
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const tmpDb = path.join(os.tmpdir(), `webhook-idem-${Date.now()}.db`);
const db = new DatabaseSync(tmpDb);

db.exec(`
    CREATE TABLE webhook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stripe_event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT,
        processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        clientName TEXT,
        email TEXT,
        status TEXT,
        totalAmount REAL,
        albumId TEXT,
        stripe_session_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

let pass = 0, fail = 0;
function check(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { console.log(`  ✓ ${name}`); pass++; }
    else    { console.log(`  ✗ ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); fail++; }
}

// Replicate the Gallery webhook handler logic
function processWebhookEvent(event) {
    // 1) Idempotency check
    try {
        db.prepare(`INSERT INTO webhook_events (stripe_event_id, event_type, payload, processed) VALUES (?, ?, ?, 0)`)
            .run(event.id, event.type, JSON.stringify(event));
    } catch (err) {
        if (String(err.message).includes("UNIQUE")) {
            return { status: 200, body: { received: true, idempotent: true } };
        }
        throw err;
    }

    // 2) Process the event
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const existing = db.prepare(`SELECT id FROM orders WHERE stripe_session_id = ? LIMIT 1`).get(session.id);
        if (!existing) {
            db.prepare(`
                INSERT INTO orders (id, clientName, email, status, totalAmount, albumId, stripe_session_id)
                VALUES (?, ?, ?, 'paid', ?, ?, ?)
            `).run(
                `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                session.customer_details?.name || "Guest",
                session.customer_email,
                session.amount_total / 100,
                session.metadata?.albumId || "",
                session.id
            );
        }
    }
    db.prepare(`UPDATE webhook_events SET processed = 1 WHERE stripe_event_id = ?`).run(event.id);
    return { status: 200, body: { received: true, idempotent: false } };
}

console.log("\n=== Stripe Webhook Idempotency E2E (P0-3) ===\n");

// === Test 1: First delivery of a checkout.session.completed creates 1 order ===
const event1 = {
    id: "evt_test_001",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_aaa", customer_email: "alice@example.com", amount_total: 4900, customer_details: { name: "Alice" }, metadata: { albumId: "album-1" } } },
};
const r1 = processWebhookEvent(event1);
check("1. First delivery returns 200", r1.status, 200);
check("1a. First delivery is not idempotent", r1.body.idempotent, false);
check("1b. 1 order created", db.prepare("SELECT COUNT(*) as c FROM orders").get().c, 1);
check("1c. 1 webhook event recorded", db.prepare("SELECT COUNT(*) as c FROM webhook_events").get().c, 1);

// === Test 2: Same event delivered again (Stripe retry) — no duplicate order ===
const r2 = processWebhookEvent(event1);
check("2. Duplicate delivery returns 200", r2.status, 200);
check("2a. Duplicate is marked idempotent", r2.body.idempotent, true);
check("2b. Still 1 order (no duplicate)", db.prepare("SELECT COUNT(*) as c FROM orders").get().c, 1);
check("2c. Still 1 webhook event row", db.prepare("SELECT COUNT(*) as c FROM webhook_events").get().c, 1);

// === Test 3: Third retry (network blip) — same outcome ===
const r3 = processWebhookEvent(event1);
check("3. Triple delivery returns 200", r3.status, 200);
check("3a. Triple is idempotent", r3.body.idempotent, true);
check("3b. STILL only 1 order after 3 deliveries", db.prepare("SELECT COUNT(*) as c FROM orders").get().c, 1);

// === Test 4: A DIFFERENT event (different stripe event ID) creates new order ===
const event2 = {
    id: "evt_test_002",
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_bbb", customer_email: "bob@example.com", amount_total: 9900, customer_details: { name: "Bob" }, metadata: { albumId: "album-2" } } },
};
const r4 = processWebhookEvent(event2);
check("4. New event returns 200", r4.status, 200);
check("4a. New event is not idempotent", r4.body.idempotent, false);
check("4b. 2 orders total (different sessions)", db.prepare("SELECT COUNT(*) as c FROM orders").get().c, 2);
check("4c. 2 webhook events total", db.prepare("SELECT COUNT(*) as c FROM webhook_events").get().c, 2);

// === Test 5: Webhook with no checkout.session.completed event (e.g. payment_intent.succeeded) ===
const event3 = {
    id: "evt_test_003",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_test_ccc", amount: 4900 } },
};
const r5 = processWebhookEvent(event3);
check("5. payment_intent.succeeded returns 200", r5.status, 200);
check("5a. No new order (we only handle checkout.session.completed)", db.prepare("SELECT COUNT(*) as c FROM orders").get().c, 2);
check("5b. Webhook event still recorded for audit", db.prepare("SELECT COUNT(*) as c FROM webhook_events WHERE event_type = 'payment_intent.succeeded'").get().c, 1);

// === Test 6: Even if webhook_events is truncated, stripe_session_id dedup still works ===
db.prepare("DELETE FROM webhook_events").run();
check("6a. webhook_events cleared (simulated retention)", db.prepare("SELECT COUNT(*) as c FROM webhook_events").get().c, 0);
const r6 = processWebhookEvent(event1);  // Same event as test 1, 2, 3
check("6b. Returns 200 even with cleared audit", r6.status, 200);
// Note: idempotent=false because webhook_events is fresh (event_id not seen).
// The SECOND-layer dedup (orders.stripe_session_id) is what protected us — see 6d.
check("6c. webhook_events is fresh (idempotent=false at this layer)", r6.body.idempotent, false);
check("6d. Still 2 orders (orders-layer dedup caught it)", db.prepare("SELECT COUNT(*) as c FROM orders").get().c, 2);

// === Cleanup ===
db.close();
fs.rmSync(tmpDb);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
