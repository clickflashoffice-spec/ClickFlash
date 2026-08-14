import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Wait for sidebar to be fully rendered after login
    await page.locator('button:has-text("Settings")').waitFor({ state: "visible", timeout: 15000 });
  });

  test("should navigate to Settings view without PIN", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
  });

  test("no PIN modal appears for Settings", async ({ page }) => {
    await page.click('button:has-text("Settings")');
    const modal = page.locator('[role="dialog"]');
    const visible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
    expect(visible).toBe(false);
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
  });

  test("should display settings categories", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    const settingsContent = page.locator('text=General').or(page.locator('text=Account')).or(page.locator('text=Backup'));
    await expect(settingsContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to General settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    const generalTab = page.locator('button:has-text("General")').first();
    await expect(generalTab).toBeVisible({ timeout: 10000 });
    await generalTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Account settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const accountTab = page.locator('button:has-text("Account")').first();
    await expect(accountTab).toBeVisible({ timeout: 10000 });
    await accountTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to User Management", async ({ page }) => {
    await navigateToView(page, "Settings");
    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    await expect(usersTab).toBeVisible({ timeout: 10000 });
    await usersTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Backup settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const backupTab = page.locator('button:has-text("Backup")').first();
    await expect(backupTab).toBeVisible({ timeout: 10000 });
    await backupTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Cloud settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const cloudTab = page.locator('button:has-text("Cloud")').first();
    await expect(cloudTab).toBeVisible({ timeout: 10000 });
    await cloudTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Watermark settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    // Ensure settings nav has loaded by waiting for a non-gated tab
    await expect(page.locator('button:has-text("General")').first()).toBeVisible({ timeout: 10000 });
    // Watermark tab only renders when features.watermark is enabled for the destination
    const watermarkTab = page.locator('button:has-text("Watermark")').first();
    const isVisible = await watermarkTab.isVisible();
    test.skip(!isVisible, "Watermark feature not enabled in test destination");
    await watermarkTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Photo settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const photoTab = page.locator('button:has-text("Photo")').first();
    await expect(photoTab).toBeVisible({ timeout: 10000 });
    await photoTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Permissions", async ({ page }) => {
    await navigateToView(page, "Settings");
    const permTab = page.locator('button:has-text("Permissions")').first();
    await expect(permTab).toBeVisible({ timeout: 10000 });
    await permTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Kiosk settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const kioskTab = page.locator('button:has-text("Kiosk")').first();
    await expect(kioskTab).toBeVisible({ timeout: 10000 });
    await kioskTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to AI settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 15000 });
    // Ensure settings nav has loaded before looking for AI tab
    await expect(page.locator('button:has-text("General")').first()).toBeVisible({ timeout: 10000 });
    // AI tab label is "AI & Face Recognition" — may be below the fold in the settings nav
    const aiTab = page.locator('button:has-text("AI")').first();
    await aiTab.scrollIntoViewIfNeeded();
    await expect(aiTab).toBeVisible({ timeout: 15000 });
    await aiTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Print settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const printTab = page.locator('button:has-text("Print")').first();
    await expect(printTab).toBeVisible({ timeout: 10000 });
    await printTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Database settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const dbTab = page.locator('button:has-text("Database")').first();
    await expect(dbTab).toBeVisible({ timeout: 10000 });
    await dbTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Categories settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const catTab = page.locator('button:has-text("Categories"), button:has-text("Category")').first();
    await expect(catTab).toBeVisible({ timeout: 10000 });
    await catTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to Session Types settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const sessTab = page.locator('button:has-text("Session Types"), button:has-text("Sessions")').first();
    await expect(sessTab).toBeVisible({ timeout: 10000 });
    await sessTab.click();
    await page.waitForTimeout(500);
  });

  test("should navigate to System Status", async ({ page }) => {
    await navigateToView(page, "Settings");
    const sysTab = page.locator('button:has-text("System"), button:has-text("Status")').first();
    await expect(sysTab).toBeVisible({ timeout: 10000 });
    await sysTab.click();
    await page.waitForTimeout(500);
  });

  test("should return to dashboard from settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('button[aria-current="page"]:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });

  test("should navigate between settings and albums", async ({ page }) => {
    await navigateToView(page, "Settings");
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });
});
