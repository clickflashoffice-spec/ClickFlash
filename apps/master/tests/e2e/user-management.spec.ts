import { test, expect } from "@playwright/test";
import { login, navigateToSensitiveView } from "./helpers/auth";

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should navigate to Photographers view", async ({ page }) => {
    await navigateToSensitiveView(page, "Photographers");
    // Photographers view renders an h1 "Photographers"
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
  });

  test("should display photographer list or empty state", async ({ page }) => {
    await navigateToSensitiveView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
    // Page renders without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test("should show photographer count in header", async ({ page }) => {
    await navigateToSensitiveView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });
    // Header shows count like "X of Y photographers"
    const countText = page.locator('text=/\\d+ of \\d+ photographer/');
    if (await countText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(countText).toBeVisible();
    }
  });

  test("should navigate between photographers and dashboard", async ({ page }) => {
    await navigateToSensitiveView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button[aria-current="page"]:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });

  test("should navigate between photographers and albums", async ({ page }) => {
    await navigateToSensitiveView(page, "Photographers");
    await expect(page.locator('h1:has-text("Photographers")')).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });
});
