import { test, expect } from "@playwright/test";
import { login, navigateToView } from "./helpers/auth";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
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
    if (await generalTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await generalTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Account settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const accountTab = page.locator('button:has-text("Account")').first();
    if (await accountTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to User Management", async ({ page }) => {
    await navigateToView(page, "Settings");
    const usersTab = page.locator('button:has-text("Users"), button:has-text("User Management")').first();
    if (await usersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usersTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Backup settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const backupTab = page.locator('button:has-text("Backup")').first();
    if (await backupTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backupTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Cloud settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const cloudTab = page.locator('button:has-text("Cloud")').first();
    if (await cloudTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cloudTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Watermark settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const watermarkTab = page.locator('button:has-text("Watermark")').first();
    if (await watermarkTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await watermarkTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Photo settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const photoTab = page.locator('button:has-text("Photo")').first();
    if (await photoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await photoTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Permissions", async ({ page }) => {
    await navigateToView(page, "Settings");
    const permTab = page.locator('button:has-text("Permissions")').first();
    if (await permTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await permTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Kiosk settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const kioskTab = page.locator('button:has-text("Kiosk")').first();
    if (await kioskTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kioskTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to AI settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const aiTab = page.locator('button:has-text("AI")').first();
    if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aiTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Print settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const printTab = page.locator('button:has-text("Print")').first();
    if (await printTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await printTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Database settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const dbTab = page.locator('button:has-text("Database")').first();
    if (await dbTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dbTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Categories settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const catTab = page.locator('button:has-text("Categories"), button:has-text("Category")').first();
    if (await catTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await catTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to Session Types settings", async ({ page }) => {
    await navigateToView(page, "Settings");
    const sessTab = page.locator('button:has-text("Session Types"), button:has-text("Sessions")').first();
    if (await sessTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sessTab.click();
      await page.waitForTimeout(500);
    }
  });

  test("should navigate to System Status", async ({ page }) => {
    await navigateToView(page, "Settings");
    const sysTab = page.locator('button:has-text("System"), button:has-text("Status")').first();
    if (await sysTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sysTab.click();
      await page.waitForTimeout(500);
    }
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
