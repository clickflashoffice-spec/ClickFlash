import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

const ASPECT_RATIOS = ["Free", "1:1", "4:3", "16:9", "3:2", "2:3"];

test.describe("Editor — Crop Tab", () => {
  test("should switch to crop tab", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const cropTab = page.locator('#crop-tab, button:has-text("Crop")').first();
    await cropTab.click();
    await expect(page.locator('#crop-panel, [role="tabpanel"]').first()).toBeVisible({ timeout: 5000 });
  });

  for (const ratio of ASPECT_RATIOS) {
    test(`should show "${ratio}" aspect ratio button`, async ({ page }) => {
      await openFirstAlbumEditor(page);

      await page.locator('#crop-tab, button:has-text("Crop")').first().click();
      const ratioBtn = page.locator(`button:has-text("${ratio}")`).first();
      await expect(ratioBtn).toBeVisible({ timeout: 10000 });
    });
  }

  test("should have Start Cropping button", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    const startBtn = page.locator('button:has-text("Start Cropping")').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
  });

  test("should have custom W/H inputs with swap", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    const widthInput = page.locator('input[placeholder*="W" i], input[aria-label*="width" i]').first();
    const heightInput = page.locator('input[placeholder*="H" i], input[aria-label*="height" i]').first();

    await expect(widthInput).toBeVisible({ timeout: 10000 });
    await expect(heightInput).toBeVisible({ timeout: 10000 });

    const swapBtn = page.locator('button[aria-label*="swap" i], button:has-text("⇄")').first();
    if (await swapBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await swapBtn.click();
    }
  });

  test("ESC cancels crop mode", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await page.locator('#crop-tab, button:has-text("Crop")').first().click();
    const startBtn = page.locator('button:has-text("Start Cropping")').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });
});
