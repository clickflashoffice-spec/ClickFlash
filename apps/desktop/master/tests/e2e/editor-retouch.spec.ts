import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Retouch Tab", () => {
  test("should switch to retouch tab", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const retouchTab = page.locator('#retouch-tab, button:has-text("Retouch")').first();
    await retouchTab.click();
    await expect(page.locator('#retouch-panel, [role="tabpanel"]').first()).toBeVisible({ timeout: 5000 });
  });

  test("should display brush size slider", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const brushSlider = page.locator('[data-testid="brush-size-slider"], input[type="range"]').first();
    await expect(brushSlider).toBeVisible({ timeout: 10000 });
  });

  test("should change brush size via slider", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const brushSlider = page.locator('[data-testid="brush-size-slider"], input[type="range"]').first();
    await expect(brushSlider).toBeVisible({ timeout: 10000 });
    await brushSlider.fill("50");
    await page.waitForTimeout(200);
  });

  test("should show finish retouching button", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const finishBtn = page.locator('button:has-text("Finish Retouching"), button:has-text("Done")').first();
    await expect(finishBtn).toBeVisible({ timeout: 10000 });
  });

  test("ESC exits retouch mode", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });

  test("should display brush preview circle", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#retouch-tab, button:has-text("Retouch")').first().click();
    const preview = page.locator('[data-testid="brush-preview"], [class*="brush-preview"]').first();
    await expect(preview).toBeVisible({ timeout: 10000 });
  });
});
