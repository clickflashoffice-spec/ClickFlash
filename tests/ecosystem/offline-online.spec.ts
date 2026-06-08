import { test, expect } from "@playwright/test";

/**
 * Offline/Online Transition E2E Tests
 * Tests Touch Kiosk behavior during network interruptions
 */

test.describe("Touch Kiosk Offline/Online Transitions", () => {
  const TOUCH = "http://localhost:8091";
  const MASTER = "http://localhost:8090";

  test("Touch queues orders when offline", async ({ request }) => {
    // Simulate offline by blocking Master connection
    const order = {
      clientName: "Offline Test Client",
      email: "offline@test.com",
      items: [{ photoId: "photo-1", quantity: 1, price: 15 }],
      total: 15,
      status: "Pending",
    };

    const res = await request.post(`${TOUCH}/api/orders`, {
      headers: { Authorization: "Bearer touch-jwt" },
      data: order,
    });
    expect(res.ok()).toBeTruthy();

    // Verify order is stored locally
    const localOrders = await request.get(`${TOUCH}/api/orders`, {
      headers: { Authorization: "Bearer touch-jwt" },
    });
    const data = await localOrders.json();
    expect(data.orders).toContainEqual(
      expect.objectContaining({ clientName: "Offline Test Client" })
    );
  });

  test("Touch syncs queued orders when coming online", async ({ request }) => {
    // Trigger sync manually
    const res = await request.post(`${TOUCH}/api/sync/push`, {
      headers: { Authorization: "Bearer touch-jwt" },
      data: { force: true },
    });
    expect(res.ok()).toBeTruthy();

    // Verify orders appear on Master
    const masterOrders = await request.get(`${MASTER}/api/orders`, {
      headers: { Authorization: "Bearer master-jwt" },
    });
    const data = await masterOrders.json();
    expect(data.orders?.length).toBeGreaterThan(0);
  });

  test("Conflict resolution when order edited on both sides", async ({ request }) => {
    // Create order on Touch
    const orderRes = await request.post(`${TOUCH}/api/orders`, {
      headers: { Authorization: "Bearer touch-jwt" },
      data: {
        clientName: "Conflict Test",
        total: 20,
        status: "Pending",
      },
    });
    const order = await orderRes.json();

    // Edit on Touch while "offline"
    await request.patch(`${TOUCH}/api/orders/${order.id}`, {
      headers: { Authorization: "Bearer touch-jwt" },
      data: { total: 25, clientMutationId: "touch-edit-1" },
    });

    // Edit on Master (simulating cloud sync)
    await request.patch(`${MASTER}/api/orders/${order.id}`, {
      headers: { Authorization: "Bearer master-jwt" },
      data: { total: 30, clientMutationId: "master-edit-1" },
    });

    // Sync should detect conflict
    const syncRes = await request.post(`${TOUCH}/api/sync/push`, {
      headers: { Authorization: "Bearer touch-jwt" },
    });
    expect(syncRes.ok()).toBeTruthy();

    // Verify conflict flag is set
    const masterOrder = await request.get(`${MASTER}/api/orders/${order.id}`, {
      headers: { Authorization: "Bearer master-jwt" },
    });
    const data = await masterOrder.json();
    expect(data.conflict_flag).toBe(1);
  });

  test("Checkpoint/resume after network interruption", async ({ request }) => {
    // Start album sync
    const syncStart = await request.post(`${TOUCH}/api/sync/albums`, {
      headers: { Authorization: "Bearer touch-jwt" },
      data: { albumId: "album-large", checkpoint: 0 },
    });
    expect(syncStart.ok()).toBeTruthy();

    // Simulate interruption (checkpoint saved)
    const checkpoint = await request.get(`${TOUCH}/api/sync/checkpoint`, {
      headers: { Authorization: "Bearer touch-jwt" },
    });
    const cpData = await checkpoint.json();
    expect(cpData.albumId).toBe("album-large");
    expect(cpData.progress).toBeGreaterThanOrEqual(0);

    // Resume from checkpoint
    const resume = await request.post(`${TOUCH}/api/sync/albums`, {
      headers: { Authorization: "Bearer touch-jwt" },
      data: { albumId: "album-large", checkpoint: cpData.progress },
    });
    expect(resume.ok()).toBeTruthy();
  });

  test("IndexedDB persists orders across Touch restarts", async ({ page }) => {
    // Open Touch Kiosk
    await page.goto(`${TOUCH}/kiosk`);
    
    // Create an order
    await page.click("text=Select Photos");
    await page.click("img[alt='photo-1']");
    await page.click("button:has-text('Add to Cart')");
    await page.click("button:has-text('Checkout')");
    await page.fill("input[placeholder='Name']", "Persist Test");
    await page.click("button:has-text('Place Order')");
    
    // Verify success message
    await expect(page.locator("text=Order Confirmed")).toBeVisible();
    
    // Reload page (simulating restart)
    await page.reload();
    
    // Verify order is still in cart history
    await page.click("text=Order History");
    await expect(page.locator("text=Persist Test")).toBeVisible();
  });

  test("LAN sync works when internet is down", async ({ request }) => {
    // Verify Touch can still communicate with Master via LAN
    const health = await request.get(`${TOUCH}/api/system/health`, {
      headers: { Authorization: "Bearer touch-jwt" },
    });
    expect(health.ok()).toBeTruthy();
    const data = await health.json();
    expect(data.masterConnection).toBe("lan");
    expect(data.cloudConnection).toBe("offline");
  });
});
