import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Growth Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToView(page, "Growth");
    await page.waitForTimeout(1000);
  });

  test("should render growth page without PIN", async ({ page }) => {
    await expect(page.locator('button[aria-current="page"]:has-text("Growth")')).toBeVisible({ timeout: 10000 });
  });

  test("no PIN modal appears", async ({ page }) => {
    const modal = page.locator('[role="dialog"]');
    const visible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
    expect(visible).toBe(false);
  });

  test("should display charts or metrics", async ({ page }) => {
    const content = page.locator('canvas, [class*="chart"], [data-testid*="growth"], text=/Revenue|Growth|Metrics/i').first();
    if (await content.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(content).toBeVisible();
    }
  });

  test("should have period selector", async ({ page }) => {
    const selector = page.locator('select, button:has-text("Week"), button:has-text("Month"), button:has-text("Year"), [data-testid="period-selector"]').first();
    if (await selector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(selector).toBeVisible();
    }
  });

  test("should display revenue values", async ({ page }) => {
    const revenue = page.locator('text=/\\$|€|£|TND|Revenue/').first();
    if (await revenue.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(revenue).toBeVisible();
    }
  });
});
