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

async function openFirstAlbumEditor(page: Page): Promise<boolean> {
  await login(page);
  // App uses view-state routing — URL stays at /. Navigate by clicking sidebar.
  await page.click('button:has-text("Albums")');

  // Wait for the Albums list to render
  const albumCard = page.locator('[data-testid="album-item"]').first();

  if (!(await albumCard.isVisible({ timeout: 10000 }).catch(() => false))) {
    return false; // No albums available
  }

  await albumCard.click();

  // Wait for the editor to appear
  await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
  return true;
}

test.describe("Album Editor", () => {
  test("should open editor and show toolbar", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

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
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    const count = await photos.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should activate photo on filmstrip click", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    if ((await photos.count()) < 2) test.skip(true, "Need ≥2 photos");

    // Click second photo
    await photos.nth(1).click();
    // Second photo should get the active border class (blue border)
    await expect(photos.nth(1)).toHaveClass(/border-blue-500/);
  });

  test("should navigate photos with arrow keys", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    if ((await photos.count()) < 2) test.skip(true, "Need ≥2 photos");

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
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

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
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await expect(page.locator('[data-testid="undo-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="redo-button"]')).toBeDisabled();
  });

  test("save button should be disabled when no changes", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    // Save status is 'Save Changes' and button is disabled when no dirty state
    await expect(page.locator('[data-testid="save-button"]')).toBeDisabled();
  });

  test("before/after button should be visible and toggleable", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

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
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).not.toBeDisabled();
    await expect(exportBtn).toContainText("Batch Export");
  });

  test("back button should navigate to albums when no unsaved changes", async ({
    page,
  }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.click('[data-testid="back-button"]');
    // Back returns to Album list (view-state routing — URL stays at /)
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("back button should confirm when there are unsaved changes", async ({
    page,
  }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    // Trigger a change by adjusting an edit slider (if panel visible)
    const exposureSlider = page.locator('[data-testid="exposure-slider"]');
    if (await exposureSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
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
    }
  });

  test("editor layout has photo viewer area", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    // The canvas area should exist
    await expect(
      page.locator('[data-testid="album-editor"] canvas, [data-testid="album-editor"] img').first()
    ).toBeVisible({ timeout: 10000 });
  });
});
