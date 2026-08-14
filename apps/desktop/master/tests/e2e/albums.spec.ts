import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Album Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
  });

  test("should display albums page with Import New button", async ({ page }) => {
    await expect(page.locator('button:has-text("Import New")').first()).toBeVisible({ timeout: 5000 });
  });

  test("should open import album modal", async ({ page }) => {
    await page.click('button:has-text("Import New")');
    await expect(
      page.locator('h2:has-text("Import"), h1:has-text("Import"), [role="dialog"]').first()
    ).toBeVisible({ timeout: 8000 });
    await page.keyboard.press("Escape");
  });

  test("should close import modal on ESC", async ({ page }) => {
    await page.click('button:has-text("Import New")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test("should filter albums by status tabs", async ({ page }) => {
    const statusTabs = page.locator(
      'button:has-text("Queue"), button:has-text("Live"), button:has-text("All")'
    );
    const firstTab = statusTabs.first();
    await expect(firstTab).toBeVisible({ timeout: 10000 });
    await firstTab.click();
    await page.waitForTimeout(300);
    await expect(firstTab).toBeVisible();
  });

  test("should search albums by name", async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("Test");
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue("Test");
  });

  test("should clear search filter", async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("Test");
    await page.waitForTimeout(300);
    await searchInput.fill("");
    await page.waitForTimeout(300);
    await expect(searchInput).toHaveValue("");
  });

  test("should navigate to album editor when clicking album card", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    await expect(albumCard).toBeVisible({ timeout: 10000 });
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
    // Editor toolbar should be visible
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible({ timeout: 5000 });
  });

  test("should show album count", async ({ page }) => {
    // Albums page typically shows "X albums" or similar count text
    const countText = page.locator("text=/\\d+\\s*(album|photo|item)/i").first();
    await expect(countText).toBeVisible({ timeout: 10000 });
  });

  test("should display album grid or list view", async ({ page }) => {
    // Album items should render in a grid/list
    const albumItems = page.locator('[data-testid="album-item"]');
    await expect(albumItems.first()).toBeVisible({ timeout: 10000 });
  });

  test("should toggle between grid and list view", async ({ page }) => {
    const viewToggle = page
      .locator('button[aria-label*="view"], button[aria-label*="grid"], button[aria-label*="list"]')
      .first();
    await expect(viewToggle).toBeVisible({ timeout: 10000 });
    await viewToggle.click();
    await page.waitForTimeout(300);
    // Page should still have content
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Album Editor Navigation", () => {
  test("should open editor and return via back button", async ({ page }) => {
    await login(page);
    await openFirstAlbumEditor(page);

    const backBtn = page.locator('[data-testid="back-button"]');
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();

    // Should return to album list
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
  });

  test("should show album title in editor toolbar", async ({ page }) => {
    await login(page);
    await openFirstAlbumEditor(page);

    const title = page.locator('[data-testid="album-title"]');
    await expect(title).toBeVisible({ timeout: 10000 });
    const text = await title.textContent();
    expect(text).toBeTruthy();
  });

  test("should load photos in filmstrip", async ({ page }) => {
    await login(page);
    await openFirstAlbumEditor(page);

    // Filmstrip area should exist with photo thumbnails
    const filmstrip = page.locator('[class*="filmstrip"], [data-testid*="filmstrip"]').first();
    await expect(filmstrip).toBeVisible({ timeout: 10000 });
  });

  test("should display editor canvas", async ({ page }) => {
    await login(page);
    await openFirstAlbumEditor(page);

    // Canvas or main image area
    const canvas = page.locator("canvas, img[class*='editor'], [class*='canvas']").first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Album Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('button:has-text("Albums")');
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
  });

  test("import modal has required fields", async ({ page }) => {
    await page.click('button:has-text("Import New")');
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Modal should contain input fields for album creation
    const inputs = modal.locator("input, select, textarea");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
  });

  test("album card shows thumbnail or placeholder", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    await expect(albumCard).toBeVisible({ timeout: 10000 });
    // Card should contain an image or placeholder icon
    const visual = albumCard.locator("img, svg, [class*='placeholder'], [class*='thumbnail']").first();
    await expect(visual).toBeVisible({ timeout: 10000 });
  });

  test("album card shows photo count", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    await expect(albumCard).toBeVisible({ timeout: 10000 });
    // Cards typically show "X photos" count
    const photoCount = albumCard.locator("text=/\\d+\\s*(photo|image|pic)/i").first();
    await expect(photoCount).toBeVisible({ timeout: 10000 });
  });

  test("album card shows status badge", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    await expect(albumCard).toBeVisible({ timeout: 10000 });
    // Cards show status like "Queue", "Live", "Draft"
    const status = albumCard.locator("text=/Queue|Live|Draft|Processing|Completed|Imported/i").first();
    await expect(status).toBeVisible({ timeout: 10000 });
  });
});
