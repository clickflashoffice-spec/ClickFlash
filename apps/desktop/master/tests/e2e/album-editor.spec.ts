import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Album Editor E2E Tests
 *
 * Covers: toolbar buttons, filmstrip, undo/redo, before/after, save status,
 * batch export, send-to-kiosk, keyboard navigation, and editor layout.
 *
 * Requires at least one album with photos to be present in the test DB.
 */

async function openFirstAlbumEditor(page: Page): Promise<void> {
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text()); });
  await login(page);
  // App uses view-state routing — URL stays at /. Navigate by clicking sidebar.
  await page.click('button:has-text("Albums")');
  await expect(page.locator('h1', { hasText: 'Album Workflow' })).toBeVisible({ timeout: 45000 });

  // Wait for the Albums list to render
  const albumCard = page.locator('[data-testid="album-item"]').first();
  await expect(albumCard).toBeVisible({ timeout: 45000 });

  await albumCard.click();

  // Wait for the editor to appear
  await page.waitForSelector('[data-testid="album-editor"]', { timeout: 30000 });
}

test.describe("Album Editor", () => {
  // Opening the album editor involves login + lazy-loading Albums + loading the editor.
  // Under concurrent Playwright workers this chain regularly exceeds the default 60 s timeout.
  test.describe.configure({ timeout: 120_000 });

  test("should open editor and show toolbar", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="album-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="undo-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="redo-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-to-kiosk-button"]')).toBeVisible();
  });

  test("should display filmstrip with photos", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    const count = await photos.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should activate photo on filmstrip click", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    // Click second photo
    await photos.nth(1).click();
    // Second photo should get the active border class (blue border)
    await expect(photos.nth(1)).toHaveClass(/border-blue-500/);
  });

  test("should navigate photos with arrow keys", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    // Activate first photo
    await photos.first().click();
    await expect(photos.first()).toHaveClass(/border-blue-500/);

    // Move to next with arrow
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await expect(photos.nth(1)).toHaveClass(/border-blue-500/);

    // Move back
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(200);
    await expect(photos.first()).toHaveClass(/border-blue-500/);
  });

  test("should select photo with checkbox", async ({ page }) => {
    await openFirstAlbumEditor(page);

    // Hover to reveal checkbox, then click it
    const firstCard = page
      .locator('[data-testid="filmstrip-photo"]')
      .first()
      .locator("..");
    await firstCard.hover();
    const checkbox = firstCard.locator('button[aria-label*="Select"]');
    await checkbox.click();

    await expect(page.locator('[data-testid="selected-count"]')).toContainText("1");
  });

  test("undo button should be disabled initially", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="undo-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="redo-button"]')).toBeDisabled();
  });

  test("save button should be disabled when no changes", async ({ page }) => {
    await openFirstAlbumEditor(page);

    // Save status is 'Save Changes' and button is disabled when no dirty state
    await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
  });

  test("before/after button should be visible and toggleable", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const baBtn = page.locator('[data-testid="before-after-button"]');
    await expect(baBtn).toBeVisible();
    await expect(baBtn).toContainText("B/A");

    // Hold down to trigger "Before" state
    await baBtn.dispatchEvent("mousedown");
    await expect(baBtn).toContainText("Before");

    // Release
    await baBtn.dispatchEvent("mouseup");
    await expect(baBtn).toContainText("B/A");
  });

  test("export button should be visible and not disabled", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
    await expect(exportBtn).toContainText("Batch Export");
  });

  test("back button should navigate to albums when no unsaved changes", async ({
    page,
  }) => {
    await openFirstAlbumEditor(page);

    await page.click('[data-testid="back-button"]');
    // Back returns to Album list (view-state routing — URL stays at /)
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("back button should confirm when there are unsaved changes", async ({
    page,
  }) => {
    await openFirstAlbumEditor(page);

    // FilterPanel sliders have no data-testid — find the first range input in the editor
    const exposureSlider = page.locator('[data-testid="album-editor"] input[type="range"]').first();
    await expect(exposureSlider).toBeVisible({ timeout: 10000 });
    await exposureSlider.fill("20");
    await page.waitForTimeout(300);

    // Back button should now show amber color (dirty state)
    const backBtn = page.locator('[data-testid="back-button"]');
    await expect(backBtn).toHaveClass(/text-amber-600/);

    // Dismiss confirm dialog
    page.once("dialog", (dialog) => dialog.dismiss());
    await backBtn.click();

    // Should still be in editor
    await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
  });

  test("editor layout has photo viewer area", async ({ page }) => {
    await openFirstAlbumEditor(page);

    // The canvas area should exist
    await expect(
      page.locator('[data-testid="album-editor"] canvas, [data-testid="album-editor"] img').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
