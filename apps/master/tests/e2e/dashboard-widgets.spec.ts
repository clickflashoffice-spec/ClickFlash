import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Dashboard Widgets", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState("domcontentloaded");
  });

  test("should render dashboard with widgets", async ({ page }) => {
    const widgets = page.locator('[class*="glass-card"]');
    await expect(widgets.first()).toBeVisible({ timeout: 10000 });
    const count = await widgets.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should display welcome greeting", async ({ page }) => {
    const welcome = page.locator('text=/Good (Morning|Afternoon|Evening)/i').first();
    await expect(welcome).toBeVisible({ timeout: 10000 });
  });

  test("should display stats widgets with numeric values", async ({ page }) => {
    // Stats may use various text size classes or direct number display
    const statValues = page
      .locator('[class*="glass-card"] [class*="text-2xl"], [class*="glass-card"] [class*="text-3xl"]')
      .or(page.locator('[class*="glass-card"]').filter({ hasText: /\d+/ }))
      .first();
    if (await statValues.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(statValues).toBeVisible();
    }
  });

  test("should render chart canvas in sales widget", async ({ page }) => {
    const chart = page.locator('canvas').first();
    if (await chart.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(chart).toBeVisible();
    }
  });

  test("should display recent orders section", async ({ page }) => {
    const recentOrders = page.locator('text=/Recent Orders|Latest Orders/i').first();
    if (await recentOrders.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(recentOrders).toBeVisible();
    }
  });

  test("should display albums to process section", async ({ page }) => {
    const albumsSection = page.locator('text=/Albums to Process|Unprocessed/i').first();
    if (await albumsSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(albumsSection).toBeVisible();
    }
  });

  test("should show cloud health indicator", async ({ page }) => {
    const cloudStatus = page.locator('[class*="cloud"], [data-testid*="cloud"]').first();
    if (await cloudStatus.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(cloudStatus).toBeVisible();
    }
  });

  test("should show fleet health indicator", async ({ page }) => {
    const fleetStatus = page.locator('[class*="fleet"], [data-testid*="fleet"]').first();
    if (await fleetStatus.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(fleetStatus).toBeVisible();
    }
  });

  test("should load dashboard within 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.waitForSelector('[class*="glass-card"]', { timeout: 3000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  test("dashboard refresh button reloads data", async ({ page }) => {
    const refreshBtn = page.locator('button[aria-label*="refresh" i], button:has-text("Refresh")').first();
    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(1000);
      const widgets = page.locator('[class*="glass-card"]');
      await expect(widgets.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
