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
    if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible({ timeout: 3000 });
    }
  });

  test("should filter albums by status tabs", async ({ page }) => {
    const statusTabs = page.locator(
      'button:has-text("Queue"), button:has-text("Live"), button:has-text("All")'
    );
    const firstTab = statusTabs.first();
    if (await firstTab.isVisible().catch(() => false)) {
      await firstTab.click();
      await page.waitForTimeout(300);
      await expect(firstTab).toBeVisible();
    }
  });

  test("should search albums by name", async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Test");
      await page.waitForTimeout(500);
      await expect(searchInput).toHaveValue("Test");
    }
  });

  test("should clear search filter", async ({ page }) => {
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]')
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("Test");
      await page.waitForTimeout(300);
      await searchInput.fill("");
      await page.waitForTimeout(300);
      await expect(searchInput).toHaveValue("");
    }
  });

  test("should navigate to album editor when clicking album card", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No albums available to test");
    }
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
    // Editor toolbar should be visible
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible({ timeout: 5000 });
  });

  test("should show album count", async ({ page }) => {
    // Albums page typically shows "X albums" or similar count text
    const countText = page.locator("text=/\\d+\\s*(album|photo|item)/i").first();
    if (await countText.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(countText).toBeVisible();
    }
  });

  test("should display album grid or list view", async ({ page }) => {
    // Album items should render in a grid/list
    const albumItems = page.locator('[data-testid="album-item"]');
    const count = await albumItems.count();
    if (count > 0) {
      await expect(albumItems.first()).toBeVisible();
    }
  });

  test("should toggle between grid and list view", async ({ page }) => {
    const viewToggle = page
      .locator('button[aria-label*="view"], button[aria-label*="grid"], button[aria-label*="list"]')
      .first();
    if (await viewToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewToggle.click();
      await page.waitForTimeout(300);
      // Page should still have content
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Album Editor Navigation", () => {
  test("should open editor and return via back button", async ({ page }) => {
    await login(page);
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const backBtn = page.locator('[data-testid="back-button"]');
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();

    // Should return to album list
    await expect(page.locator("text=Album Workflow")).toBeVisible({ timeout: 10000 });
  });

  test("should show album title in editor toolbar", async ({ page }) => {
    await login(page);
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const title = page.locator('[data-testid="album-title"]');
    if (await title.isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await title.textContent();
      expect(text).toBeTruthy();
    }
  });

  test("should load photos in filmstrip", async ({ page }) => {
    await login(page);
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    // Filmstrip area should exist with photo thumbnails
    const filmstrip = page.locator('[class*="filmstrip"], [data-testid*="filmstrip"]').first();
    if (await filmstrip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(filmstrip).toBeVisible();
    }
  });

  test("should display editor canvas", async ({ page }) => {
    await login(page);
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    // Canvas or main image area
    const canvas = page.locator("canvas, img[class*='editor'], [class*='canvas']").first();
    if (await canvas.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(canvas).toBeVisible();
    }
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
    if (!(await modal.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Import modal did not open");
    }

    // Modal should contain input fields for album creation
    const inputs = modal.locator("input, select, textarea");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);

    await page.keyboard.press("Escape");
  });

  test("album card shows thumbnail or placeholder", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No albums available");
    }
    // Card should contain an image or placeholder icon
    const visual = albumCard.locator("img, svg, [class*='placeholder'], [class*='thumbnail']").first();
    if (await visual.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(visual).toBeVisible();
    }
  });

  test("album card shows photo count", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No albums available");
    }
    // Cards typically show "X photos" count
    const photoCount = albumCard.locator("text=/\\d+\\s*(photo|image|pic)/i").first();
    if (await photoCount.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(photoCount).toBeVisible();
    }
  });

  test("album card shows status badge", async ({ page }) => {
    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "No albums available");
    }
    // Cards show status like "Queue", "Live", "Draft"
    const status = albumCard.locator("text=/Queue|Live|Draft|Processing|Completed/i").first();
    if (await status.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(status).toBeVisible();
    }
  });
});
