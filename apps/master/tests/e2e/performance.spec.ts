import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Performance Tests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("dashboard should load within 3 seconds after login", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test("should measure page navigation performance", async ({ page }) => {
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return nav ? nav.loadEventEnd - nav.startTime : null;
    });
    if (timing !== null) {
      expect(timing).toBeLessThan(5000);
    }
  });

  test("album list should render within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 15000 });
    const renderTime = Date.now() - startTime;
    // Dev mode with HMR is significantly slower than production
    // CI threshold: 10s (dev), production should be <2s
    expect(renderTime).toBeLessThan(10000);
  });

  test("sidebar navigation should complete within 5s", async ({ page }) => {
    const views = ["Albums", "Dashboard"];
    for (const view of views) {
      const startTime = Date.now();
      await page.click(`button:has-text("${view}")`);
      await page.locator(`button[aria-current="page"]:has-text("${view}")`).waitFor({ timeout: 10000 });
      const navTime = Date.now() - startTime;
      // Dev mode lazy-loads chunks; production should be <1s
      expect(navTime).toBeLessThan(5000);
    }
  });

  test("editor should open within 2 seconds", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });

    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No albums available");
    }

    const startTime = Date.now();
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
    const editorTime = Date.now() - startTime;
    expect(editorTime).toBeLessThan(2000);
  });

  test("settings page should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.click('button:has-text("Settings")');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    const settingsTime = Date.now() - startTime;
    // Dev mode lazy-loads chunks; production should be <2s
    expect(settingsTime).toBeLessThan(10000);
  });

  test("orders page should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.click('button:has-text("Orders")');
    await expect(page.locator('button[aria-current="page"]:has-text("Orders")')).toBeVisible({ timeout: 10000 });
    const ordersTime = Date.now() - startTime;
    expect(ordersTime).toBeLessThan(10000);
  });

  test("health endpoint responds within 500ms", async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get("/api/health");
    const elapsed = Date.now() - startTime;
    expect(response.status()).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  test("no JS errors on dashboard load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors (e.g. ResizeObserver)
    const criticalErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("Script error")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("memory usage stays reasonable after multiple navigations", async ({ page }) => {
    const views = ["Albums", "Dashboard", "Orders", "Settings", "Albums", "Dashboard"];
    for (const view of views) {
      await page.click(`button:has-text("${view}")`);
      await page.waitForTimeout(500);
    }

    const metrics = await page.evaluate(() => {
      // @ts-ignore
      if (performance.memory) {
        // @ts-ignore
        return { usedJSHeapSize: performance.memory.usedJSHeapSize };
      }
      return null;
    });

    if (metrics) {
      // Heap should stay under 200MB after 6 navigations
      expect(metrics.usedJSHeapSize).toBeLessThan(200 * 1024 * 1024);
    }
  });
});
