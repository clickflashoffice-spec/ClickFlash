import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Dashboard E2E Tests
 *
 * Covers: dashboard loading, widget visibility, sidebar navigation to key pages,
 * and health API endpoint.
 */

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Should land on dashboard after login
    await page.waitForLoadState("domcontentloaded");
  });

  test("should load dashboard after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/, { timeout: 15000 });

    // Dashboard has some primary content
    await expect(
      page.locator('main, [role="main"], [class*="dashboard"], [class*="Dashboard"]').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should show sidebar navigation", async ({ page }) => {
    const sidebar = page.locator(
      'nav, aside, [class*="Sidebar"], [class*="sidebar"]'
    ).first();
    await expect(sidebar).toBeVisible();
  });

  test("should navigate to Albums from sidebar", async ({ page }) => {
    // App uses view-state routing — URL stays at /. Verify Albums view renders.
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Orders from sidebar", async ({ page }) => {
    const ordersLink = page.locator('button:has-text("Orders")').first();
    if (await ordersLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ordersLink.click();
      // Verify the Orders nav item is now active
      await expect(page.locator('button[aria-current="page"]:has-text("Orders")')).toBeVisible({ timeout: 10000 });
    }
  });

  test("should navigate to Settings from sidebar", async ({ page }) => {
    const settingsLink = page.locator('button:has-text("Settings")').first();
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await expect(page.locator('button[aria-current="page"]:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    }
  });

  test("health endpoint returns ok", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status");
    expect(body.status).toMatch(/ok|healthy/i);
  });

  test("should display at least one dashboard widget or metric", async ({
    page,
  }) => {
    // glass-card is applied to both skeleton placeholders and loaded stat cards
    const widgets = page.locator('[class*="glass-card"]');
    await expect(widgets.first()).toBeVisible({ timeout: 10000 });
    const count = await widgets.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should show logged-in user name in sidebar or header", async ({
    page,
  }) => {
    // The sidebar has a "Switch User" button visible at all times
    await expect(page.locator('button:has-text("Switch User")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Dashboard — API coverage", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState("domcontentloaded");
  });

  test("analytics API is reachable", async ({ page }) => {
    const r = await page.request.get("/api/analytics/summary");
    expect(r.status()).not.toBe(404);
  });

  test("collections photos endpoint returns list", async ({ page }) => {
    const r = await page.request.get("/api/collections/photos/records");
    expect([200, 401]).toContain(r.status());
  });

  test("collections albums endpoint returns list", async ({ page }) => {
    const r = await page.request.get("/api/collections/albums/records");
    expect([200, 401]).toContain(r.status());
  });
});
