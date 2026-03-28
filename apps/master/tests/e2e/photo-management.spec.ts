import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Photo Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should categorize photos", async ({ page }) => {
    await page.goto("/albums/test-album");

    // Select multiple photos
    await page.click('[data-testid="photo-item"]:nth-child(1)');
    await page.click('[data-testid="photo-item"]:nth-child(2)', {
      modifiers: ["Control"],
    });

    // Apply category
    await page.click('[data-testid="bulk-categorize-button"]');
    await page.selectOption('[data-testid="category-select"]', "people");
    await page.click('[data-testid="apply-category-button"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test("should approve/reject photos", async ({ page }) => {
    await page.goto("/albums/test-album");

    // Approve photo
    await page.click(
      '[data-testid="photo-item"]:first-child [data-testid="approve-button"]',
    );
    await expect(
      page.locator('[data-testid="photo-approved-badge"]'),
    ).toBeVisible();

    // Reject photo
    await page.click(
      '[data-testid="photo-item"]:nth-child(2) [data-testid="reject-button"]',
    );
    await page.fill('[data-testid="rejection-reason-input"]', "Poor quality");
    await page.click('[data-testid="confirm-reject-button"]');

    await expect(
      page.locator('[data-testid="photo-rejected-badge"]'),
    ).toBeVisible();
  });

  test("should add tags to photos", async ({ page }) => {
    await page.goto("/albums/test-album");

    await page.click('[data-testid="photo-item"]:first-child');
    await page.click('[data-testid="edit-tags-button"]');

    await page.fill('[data-testid="tag-input"]', "portrait");
    await page.keyboard.press("Enter");
    await page.fill('[data-testid="tag-input"]', "group");
    await page.keyboard.press("Enter");

    await page.click('[data-testid="save-tags-button"]');

    await expect(page.locator('[data-testid="tag-portrait"]')).toBeVisible();
    await expect(page.locator('[data-testid="tag-group"]')).toBeVisible();
  });

  test("should bulk delete photos", async ({ page }) => {
    await page.goto("/albums/test-album");

    // Select multiple photos
    await page.click('[data-testid="photo-item"]:nth-child(1)');
    await page.click('[data-testid="photo-item"]:nth-child(2)', {
      modifiers: ["Control"],
    });
    await page.click('[data-testid="photo-item"]:nth-child(3)', {
      modifiers: ["Control"],
    });

    // Delete
    await page.click('[data-testid="bulk-delete-button"]');
    await page.click('[data-testid="confirm-delete-button"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test("should download photos", async ({ page }) => {
    await page.goto("/albums/test-album");

    await page.click(
      '[data-testid="photo-item"]:first-child [data-testid="download-button"]',
    );

    // Verify download started (check for download attribute or toast)
    await expect(
      page.locator('[data-testid="download-started-toast"]'),
    ).toBeVisible();
  });

  test("should print photos", async ({ page }) => {
    await page.goto("/albums/test-album");

    await page.click(
      '[data-testid="photo-item"]:first-child [data-testid="print-button"]',
    );
    await page.selectOption('[data-testid="print-size-select"]', "4x6");
    await page.fill('[data-testid="print-quantity-input"]', "2");

    await page.click('[data-testid="confirm-print-button"]');

    await expect(
      page.locator('[data-testid="print-job-started"]'),
    ).toBeVisible();
  });
});
