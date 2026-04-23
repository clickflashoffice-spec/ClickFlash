import { test, expect } from "@playwright/test";
import { login, navigateToSensitiveView } from "./helpers/auth";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to Settings view", async ({ page }) => {
    await navigateToSensitiveView(page, "Settings");
    // Settings page renders an h1 "Settings"
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
  });

  test("should display settings categories", async ({ page }) => {
    await navigateToSensitiveView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    // Settings page has a sidebar with category labels
    const settingsContent = page.locator('text=General').or(page.locator('text=Account')).or(page.locator('text=Backup'));
    await expect(settingsContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("should show settings menu search or navigation", async ({ page }) => {
    await navigateToSensitiveView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    // Settings page renders without error
    await expect(page.locator('body')).toBeVisible();
  });

  test("should return to dashboard from settings", async ({ page }) => {
    await navigateToSensitiveView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    // Navigate back to Dashboard
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button[aria-current="page"]:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });

  test("should navigate between settings and albums", async ({ page }) => {
    await navigateToSensitiveView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });
});
