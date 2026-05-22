import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to Dashboard from sidebar", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button[aria-current="page"]:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Albums from sidebar", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Orders from sidebar", async ({ page }) => {
    await page.click('button:has-text("Orders")');
    await expect(page.locator('button[aria-current="page"]:has-text("Orders")')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Photographers from sidebar without PIN", async ({ page }) => {
    await navigateToView(page, "Photographers");
    await expect(page.locator('button[aria-current="page"]:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Growth from sidebar without PIN", async ({ page }) => {
    await navigateToView(page, "Growth");
    await expect(page.locator('button[aria-current="page"]:has-text("Growth")')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Settings from sidebar without PIN", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to Resort BI from sidebar", async ({ page }) => {
    const biBtn = page.locator('button:has-text("Resort BI")').first();
    await expect(biBtn).toBeVisible({ timeout: 10000 });
    await biBtn.click();
    await expect(page.locator('button[aria-current="page"]:has-text("Resort BI")')).toBeVisible({ timeout: 10000 });
  });

  test("should toggle sidebar collapse/expand", async ({ page }) => {
    const collapseBtn = page.locator('[data-testid="sidebar-toggle"], button[aria-label*="collapse" i]').first();
    await expect(collapseBtn).toBeVisible({ timeout: 10000 });
    await collapseBtn.click();
    await page.waitForTimeout(300);
    await collapseBtn.click();
    await page.waitForTimeout(300);
  });

  test("should open global search with Ctrl+K", async ({ page }) => {
    await page.keyboard.press("Control+k");
    const searchInput = page.locator('[data-testid="global-search-input"], input[placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test("should show Switch User button", async ({ page }) => {
    await expect(page.locator('button:has-text("Switch User")')).toBeVisible({ timeout: 5000 });
  });

  test("no PIN modal appears when navigating to any view", async ({ page }) => {
    for (const view of ["Settings", "Growth", "Photographers"]) {
      await page.click(`button:has-text("${view}")`);
      const modal = page.locator('[role="dialog"]');
      const visible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
      expect(visible).toBe(false);
      await page.click('button:has-text("Dashboard")');
      await page.waitForTimeout(300);
    }
  });
});
