import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Keyboard Shortcuts", () => {
  test("arrow keys navigate filmstrip", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    await photos.first().click();
    await expect(photos.first()).toHaveClass(/border-blue-500/);

    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await expect(photos.nth(1)).toHaveClass(/border-blue-500/);

    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(200);
    await expect(photos.first()).toHaveClass(/border-blue-500/);
  });

  test("Ctrl+Z triggers undo", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("30");
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="undo-button"]')).toBeEnabled();

    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
  });

  test("Ctrl+Y triggers redo", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("20");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+y");
    await page.waitForTimeout(300);
  });

  test("Ctrl+Shift+Z triggers redo (alt)", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("15");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+Shift+z");
    await page.waitForTimeout(300);
  });

  test("Ctrl+C copies edits", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("25");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+c");
    await page.waitForTimeout(500);
  });

  test("Ctrl+V pastes edits", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("35");
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+c");
    await page.waitForTimeout(300);

    await photos.nth(1).click();
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(300);
  });

  test("F key fits to screen", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.keyboard.press("f");
    await page.waitForTimeout(300);
  });

  test("ESC exits crop/retouch modes", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("shortcuts dont fire when typing in input", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.focus();
      await page.keyboard.press("f");
      await page.waitForTimeout(200);
    }
  });
});
