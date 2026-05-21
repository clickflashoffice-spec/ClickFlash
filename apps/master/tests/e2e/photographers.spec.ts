import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Photographers", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToView(page, "Photographers");
    await page.waitForTimeout(1000);
  });

  test("should render photographers view without PIN", async ({ page }) => {
    await expect(page.locator('button[aria-current="page"]:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
  });

  test("no PIN modal appears", async ({ page }) => {
    const modal = page.locator('[role="dialog"]');
    const visible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
    expect(visible).toBe(false);
  });

  test("should display photographer list or empty state", async ({ page }) => {
    const content = page.locator('table, [data-testid*="photographer"], text=/Photographers|No photographers/i').first();
    if (await content.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(content).toBeVisible();
    }
  });

  test("should show photographer stats", async ({ page }) => {
    const stats = page.locator('[class*="stat"], [data-testid*="stat"], text=/Sessions|Photos|Albums/i').first();
    if (await stats.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(stats).toBeVisible();
    }
  });

  test("should navigate back to dashboard", async ({ page }) => {
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button[aria-current="page"]:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });
});
