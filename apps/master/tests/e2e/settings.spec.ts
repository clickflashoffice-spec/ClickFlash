import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should update studio information", async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');

    await page.fill('[data-testid="studio-name-input"]', "My Photo Studio");
    await page.fill('[data-testid="studio-address-input"]', "123 Main St");
    await page.fill('[data-testid="studio-phone-input"]', "555-1234");
    await page.fill('[data-testid="studio-email-input"]', "contact@studio.com");

    await page.click('[data-testid="save-settings-button"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test("should configure backup settings", async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');
    await page.click('[data-testid="backup-tab"]');

    await page.check('[data-testid="enable-backup-checkbox"]');
    await page.selectOption('[data-testid="backup-frequency-select"]', "daily");
    await page.fill('[data-testid="backup-time-input"]', "02:00");

    await page.click('[data-testid="save-backup-settings-button"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test("should configure printer settings", async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');
    await page.click('[data-testid="printer-tab"]');

    await page.selectOption(
      '[data-testid="default-printer-select"]',
      "Printer1",
    );
    await page.selectOption('[data-testid="paper-size-select"]', "4x6");
    await page.selectOption('[data-testid="print-quality-select"]', "high");

    await page.click('[data-testid="test-print-button"]');

    await expect(page.locator('[data-testid="test-print-sent"]')).toBeVisible();
  });

  test("should manage storage locations", async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');
    await page.click('[data-testid="storage-tab"]');

    await page.click('[data-testid="add-storage-location-button"]');
    await page.fill('[data-testid="storage-name-input"]', "External Drive");
    await page.fill('[data-testid="storage-path-input"]', "E:/Photos");

    await page.click('[data-testid="save-storage-button"]');

    await expect(page.locator("text=External Drive")).toBeVisible();
  });

  test("should export data", async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');
    await page.click('[data-testid="data-tab"]');

    await page.click('[data-testid="export-data-button"]');

    // Wait for export to complete
    await expect(page.locator('[data-testid="export-complete"]')).toBeVisible({
      timeout: 30000,
    });

    // Verify download link
    await expect(
      page.locator('[data-testid="download-export-link"]'),
    ).toBeVisible();
  });
});
