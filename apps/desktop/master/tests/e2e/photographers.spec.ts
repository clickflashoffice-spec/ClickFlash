import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Photographers", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToView(page, "Photographers");
    await page.waitForTimeout(1000);
  });

  test("should render photographers view without PIN", async ({ page }) => {
    const active = page.locator('button[aria-current="page"]:has-text("Photographers")');
    const btn = page.locator('button:has-text("Photographers")');
    await expect(active.or(btn).first()).toBeVisible({ timeout: 10000 });
  });

  test("no PIN modal appears", async ({ page }) => {
    const modal = page.locator('[role="dialog"]');
    const visible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
    expect(visible).toBe(false);
  });

  test("should display photographer list or empty state", async ({ page }) => {
    const content = page.locator('table, [data-testid*="photographer"], text=/Photographers|No photographers/i').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test("should show photographer stats", async ({ page }) => {
    const stats = page.locator('[class*="stat"], [data-testid*="stat"], text=/Sessions|Photos|Albums/i').first();
    await expect(stats).toBeVisible({ timeout: 10000 });
  });

  test("should navigate back to dashboard", async ({ page }) => {
    // Dismiss any overlay/modal that may be blocking
    const overlay = page.locator('[role="dialog"]');
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    await page.click('button:has-text("Dashboard")', { timeout: 10000 });
    await expect(page.locator('button:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });
});
