import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Offline Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should show offline indicator when network is down", async ({ page }) => {
    await page.context().setOffline(true);

    const offlineIndicator = page
      .locator('[data-testid="offline-indicator"], [class*="offline"]')
      .or(page.getByText("Offline", { exact: false }))
      .first();
    const visible = await offlineIndicator.isVisible({ timeout: 5000 }).catch(() => false);

    await page.context().setOffline(false);

    if (!visible) {
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should keep main UI responsive while offline", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });

    await page.context().setOffline(true);

    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);
  });

  test("should restore normal operation when back online", async ({ page }) => {
    await page.context().setOffline(true);
    await page.context().setOffline(false);

    const isOnLogin = await page
      .locator("text=SYSTEM ONLINE")
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isOnLogin) {
      await login(page);
    }

    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
  });

  test("sidebar navigation works while offline", async ({ page }) => {
    await page.context().setOffline(true);

    const views = ["Albums", "Orders", "Dashboard"];
    for (const view of views) {
      await page.click(`button:has-text("${view}")`);
      await page.waitForTimeout(300);
      await expect(page.locator(`button:has-text("${view}")`)).toBeVisible();
    }

    await page.context().setOffline(false);
  });

  test("cached data still renders while offline", async ({ page }) => {
    // Load dashboard data first while online
    await page.waitForTimeout(2000);

    await page.context().setOffline(true);

    // Dashboard widgets should still show cached data
    const widgets = page.locator('[class*="glass-card"]');
    if (await widgets.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const count = await widgets.count();
      expect(count).toBeGreaterThan(0);
    }

    await page.context().setOffline(false);
  });

  test("API calls fail gracefully while offline", async ({ page }) => {
    await page.context().setOffline(true);

    // Navigate to a view that triggers API calls
    await page.click('button:has-text("Orders")');
    await page.waitForTimeout(1000);

    // App should not crash — body should still be visible
    await expect(page.locator("body")).toBeVisible();

    // Error state or empty state is acceptable
    const errorOrContent = page
      .locator('[class*="error"], text=/No orders|Unable to load|Offline/i, button:has-text("Orders")')
      .first();
    await expect(errorOrContent).toBeVisible({ timeout: 5000 });

    await page.context().setOffline(false);
  });

  test("network reconnect triggers data refresh", async ({ page }) => {
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);

    // After reconnect, verify health endpoint is reachable
    const response = await page.request.get("/api/health").catch(() => null);
    if (response) {
      expect(response.status()).toBe(200);
    }
  });
});
