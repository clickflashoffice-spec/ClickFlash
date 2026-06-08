import { test, expect } from "@playwright/test";

/**
 * Multi-Master Sync E2E Tests
 * Tests synchronization between multiple Master stations via Cloudflare Hub
 */

test.describe("Multi-Master Global Sync", () => {
  const MASTER_A = "http://localhost:8090";
  const MASTER_B = "http://localhost:8092"; // Second master for testing
  const HUB = "https://management.clickflash.app";

  test("Master A can register in fleet", async ({ request }) => {
    const res = await request.post(`${HUB}/api/masters/register`, {
      headers: { Authorization: "Bearer test-token" },
      data: {
        desk_id: "MASTER_TEST_A",
        name: "Test Studio A",
        location: "Test Location A",
        country: "US",
        timezone: "America/New_York",
        currency: "USD",
        hardware_fingerprint: "test-fp-a",
        version: "5.0.0",
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.status).toBe("registered");
    expect(data.desk_id).toBe("MASTER_TEST_A");
  });

  test("Master B can register in same fleet", async ({ request }) => {
    const res = await request.post(`${HUB}/api/masters/register`, {
      headers: { Authorization: "Bearer test-token" },
      data: {
        desk_id: "MASTER_TEST_B",
        name: "Test Studio B",
        location: "Test Location B",
        country: "UK",
        timezone: "Europe/London",
        currency: "GBP",
        hardware_fingerprint: "test-fp-b",
        version: "5.0.0",
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.peers).toContainEqual(
      expect.objectContaining({ desk_id: "MASTER_TEST_A" })
    );
  });

  test("Desk ID collision detection works", async ({ request }) => {
    const res = await request.get(
      `${HUB}/api/masters/check-desk-id?desk_id=MASTER_TEST_A`,
      { headers: { Authorization: "Bearer test-token" } }
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.available).toBe(false);
    expect(data.existing).toContain("MASTER_TEST_A");
  });

  test("Heartbeat from Master A updates fleet status", async ({ request }) => {
    const res = await request.post(`${HUB}/api/masters/heartbeat`, {
      headers: { Authorization: "Bearer test-token" },
      data: {
        desk_id: "MASTER_TEST_A",
        status: "Online",
        metrics: {
          cpu: { load: 15, temp: 45 },
          memory: { used: 2048, total: 8192, percent: 25 },
          disk: { used: 50, total: 500, percent: 10 },
        },
        version: "5.0.0",
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("Fleet dashboard shows all masters", async ({ request }) => {
    const res = await request.get(`${HUB}/api/masters/fleet`, {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.masters.length).toBeGreaterThanOrEqual(2);
    expect(data.masters).toContainEqual(
      expect.objectContaining({ desk_id: "MASTER_TEST_A" })
    );
    expect(data.masters).toContainEqual(
      expect.objectContaining({ desk_id: "MASTER_TEST_B" })
    );
  });

  test("Shared config propagates to new master", async ({ request }) => {
    const res = await request.post(`${HUB}/api/masters/register`, {
      headers: { Authorization: "Bearer test-token" },
      data: {
        desk_id: "MASTER_TEST_C",
        name: "Test Studio C",
        location: "Test Location C",
        country: "FR",
        timezone: "Europe/Paris",
        currency: "EUR",
        hardware_fingerprint: "test-fp-c",
        version: "5.0.0",
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.shared_config).toBeDefined();
    expect(data.shared_config.products).toBeDefined();
    expect(data.shared_config.session_types).toBeDefined();
  });

  test("Cross-desk data isolation in D1", async ({ request }) => {
    // Master A creates an order
    const orderA = await request.post(`${MASTER_A}/api/orders`, {
      headers: { Authorization: "Bearer test-jwt-a" },
      data: {
        clientName: "Client A",
        total: 100,
        desk_id: "MASTER_TEST_A",
      },
    });
    expect(orderA.ok()).toBeTruthy();

    // Master B should not see Master A's orders
    const ordersB = await request.get(`${MASTER_B}/api/orders`, {
      headers: { Authorization: "Bearer test-jwt-b" },
    });
    const dataB = await ordersB.json();
    const hasOrderA = dataB.orders?.some((o: { desk_id: string }) => o.desk_id === "MASTER_TEST_A");
    expect(hasOrderA).toBeFalsy();
  });

  test("Sync operation logs from Master to Hub", async ({ request }) => {
    const res = await request.post(`${HUB}/api/cloud/sync/operations`, {
      headers: {
        Authorization: "Bearer test-token",
        "X-Idempotency-Key": `test-${Date.now()}`,
      },
      data: {
        desk_id: "MASTER_TEST_A",
        operations: [
          {
            type: "INSERT",
            table: "orders",
            record_id: `order-${Date.now()}`,
            payload: { clientName: "Sync Test", total: 50 },
            sequence_number: 1,
          },
        ],
      },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.applied).toBe(1);
    expect(data.failed).toBe(0);
  });

  test("Idempotency prevents duplicate operations", async ({ request }) => {
    const idempotencyKey = `test-dup-${Date.now()}`;
    
    const res1 = await request.post(`${HUB}/api/cloud/sync/operations`, {
      headers: {
        Authorization: "Bearer test-token",
        "X-Idempotency-Key": idempotencyKey,
      },
      data: {
        desk_id: "MASTER_TEST_A",
        operations: [
          {
            type: "INSERT",
            table: "orders",
            record_id: `order-dup-${Date.now()}`,
            payload: { clientName: "Dup Test", total: 75 },
            sequence_number: 2,
          },
        ],
      },
    });
    expect(res1.ok()).toBeTruthy();

    const res2 = await request.post(`${HUB}/api/cloud/sync/operations`, {
      headers: {
        Authorization: "Bearer test-token",
        "X-Idempotency-Key": idempotencyKey,
      },
      data: {
        desk_id: "MASTER_TEST_A",
        operations: [
          {
            type: "INSERT",
            table: "orders",
            record_id: `order-dup-${Date.now()}`,
            payload: { clientName: "Dup Test", total: 75 },
            sequence_number: 2,
          },
        ],
      },
    });
    expect(res2.ok()).toBeTruthy();
    const data2 = await res2.json();
    expect(data2.already_applied).toBe(1);
  });
});
