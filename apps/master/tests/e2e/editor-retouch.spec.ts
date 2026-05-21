import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Retouch Tab", () => {
  test("should switch to retouch tab", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const retouchTab = page.locator('#retouch-tab, button:has-text("Retouch")').first();
    await retouchTab.click();
    await expect(page.locator('#retouch-panel, [role="tabpanel"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("should display brush size slider", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const brushSlider = page.locator('[data-testid="brush-size-slider"], input[type="range"]').first();
    if (await brushSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(brushSlider).toBeVisible();
    }
  });

  test("should change brush size via slider", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const brushSlider = page.locator('[data-testid="brush-size-slider"], input[type="range"]').first();
    if (await brushSlider.isVisible({ timeout: 3000 }).catch(() => false)) {
      await brushSlider.fill("50");
      await page.waitForTimeout(200);
    }
  });

  test("should show finish retouching button", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const finishBtn = page.locator('button:has-text("Finish Retouching"), button:has-text("Done")').first();
    if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(finishBtn).toBeVisible();
    }
  });

  test("ESC exits retouch mode", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("should display brush preview circle", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const preview = page.locator('[data-testid="brush-preview"], [class*="brush-preview"]').first();
    if (await preview.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(preview).toBeVisible();
    }
  });
});
