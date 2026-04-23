import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Performance Tests", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("dashboard should load within 3 seconds after login", async ({
    page,
  }) => {
    // After login the app lands at "/" (Dashboard view). Measure navigation back.
    const startTime = Date.now();
    // Re-navigate to reset timing
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test("should measure page navigation performance", async ({ page }) => {
    // Simple performance mark — verify PerformanceNavigation API is available
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return nav ? nav.loadEventEnd - nav.startTime : null;
    });
    // If timing is available, it should complete within 5 s
    if (timing !== null) {
      expect(timing).toBeLessThan(5000);
    }
  });

  test("album list should render within reasonable time", async ({ page }) => {
    // App uses view-state routing — navigate via sidebar
    const startTime = Date.now();
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
    const renderTime = Date.now() - startTime;

    // Albums view should be visible within 5 s of clicking the nav button
    expect(renderTime).toBeLessThan(5000);
  });

  test("sidebar navigation should be instant", async ({ page }) => {
    const views = ["Albums", "Dashboard"];
    for (const view of views) {
      const startTime = Date.now();
      await page.click(`button:has-text("${view}")`);
      // Wait for the nav button to become active (aria-current="page")
      await page
        .locator(`button[aria-current="page"]:has-text("${view}")`)
        .waitFor({ timeout: 5000 });
      const navTime = Date.now() - startTime;
      // Client-side view switch should be fast
      expect(navTime).toBeLessThan(2000);
    }
  });
});
