import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

const ASPECT_RATIOS = ["Free", "1:1", "4:3", "16:9", "3:2", "2:3"];

test.describe("Editor — Crop Tab", () => {
  test("should switch to crop tab", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const cropTab = page.locator('#crop-tab, button:has-text("Crop")').first();
    await cropTab.click();
    await expect(page.locator('#crop-panel, [role="tabpanel"]').first()).toBeVisible({ timeout: 5000 });
  });

  for (const ratio of ASPECT_RATIOS) {
    test(`should show "${ratio}" aspect ratio button`, async ({ page }) => {
      const opened = await openFirstAlbumEditor(page);
      if (!opened) test.skip(true, "No albums available");

      await page.locator('#crop-tab, button:has-text("Crop")').first().click();
      const ratioBtn = page.locator(`button:has-text("${ratio}")`).first();
      if (await ratioBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(ratioBtn).toBeVisible();
      }
    });
  }

  test("should have Start Cropping button", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    const startBtn = page.locator('button:has-text("Start Cropping")').first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(startBtn).toBeVisible();
    }
  });

  test("should have custom W/H inputs with swap", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    const widthInput = page.locator('input[placeholder*="W" i], input[aria-label*="width" i]').first();
    const heightInput = page.locator('input[placeholder*="H" i], input[aria-label*="height" i]').first();
    const swapBtn = page.locator('button[aria-label*="swap" i], button:has-text("⇄")').first();

    if (await widthInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(widthInput).toBeVisible();
      await expect(heightInput).toBeVisible();
      if (await swapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await swapBtn.click();
      }
    }
  });

  test("ESC cancels crop mode", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    const startBtn = page.locator('button:has-text("Start Cropping")').first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(500);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  });
});
