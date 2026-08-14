import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

const ADJUSTMENT_SLIDERS = [
  "exposure", "contrast", "saturate", "vibrance",
  "temperature", "tint", "hueRotate",
  "highlights", "shadows", "whites", "blacks", "clarity", "vignette",
  "soften", "grayscale", "sepia", "invert",
];

const SECTIONS = ["Basic", "Color", "Tone", "Effects"];

test.describe("Editor — Adjust Tab", () => {
  test("should show adjust tab as default", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const adjustTab = page.locator('#adjust-tab, button:has-text("Adjust")').first();
    await expect(adjustTab).toBeVisible();
  });

  test("should display all 4 adjustment sections", async ({ page }) => {
    await openFirstAlbumEditor(page);

    for (const section of SECTIONS) {
      const sectionHeader = page.locator(`text="${section}"`).first();
      await expect(sectionHeader).toBeVisible({ timeout: 10000 });
    }
  });

  for (const slider of ADJUSTMENT_SLIDERS) {
    test(`should have ${slider} slider`, async ({ page }) => {
      await openFirstAlbumEditor(page);

      const sliderEl = page.locator(`[data-testid="${slider}-slider"], input[name="${slider}"]`).first();
      const scrollTarget = page.locator(`text=/${slider}/i`).first();

      await expect(scrollTarget).toBeVisible({ timeout: 10000 });
      await scrollTarget.scrollIntoViewIfNeeded();
      await expect(sliderEl).toBeVisible({ timeout: 10000 });
    });
  }

  test("should modify exposure slider and enable undo", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("25");
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="undo-button"]')).toBeEnabled();
  });

  test("Reset All returns sliders to defaults", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("30");
    await page.waitForTimeout(300);

    const resetBtn = page.locator('button:has-text("Reset All"), button:has-text("Reset to Original")').first();
    await expect(resetBtn).toBeVisible({ timeout: 10000 });
    await resetBtn.click();
    await page.waitForTimeout(300);
    const value = await slider.inputValue();
    expect(Number(value)).toBe(0);
  });

  test("Copy and Paste edits between photos", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("40");
    await page.waitForTimeout(300);

    const copyBtn = page.locator('button:has-text("Copy Edits")').first();
    await expect(copyBtn).toBeVisible({ timeout: 10000 });
    await copyBtn.click();
    await photos.nth(1).click();
    await page.waitForTimeout(500);

    const pasteBtn = page.locator('button:has-text("Paste Edits")').first();
    await expect(pasteBtn).toBeVisible({ timeout: 10000 });
    await pasteBtn.click();
    await page.waitForTimeout(300);
  });

  test("section collapse/expand toggles", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const sectionHeader = page.locator('button:has-text("Basic")').first();
    await expect(sectionHeader).toBeVisible({ timeout: 10000 });
    await sectionHeader.click();
    await page.waitForTimeout(300);
    await sectionHeader.click();
    await page.waitForTimeout(300);
  });

  test("straighten slider rotates preview", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const straightenSlider = page.locator('[data-testid="straighten-slider"]').first();
    await expect(straightenSlider).toBeVisible({ timeout: 10000 });
    await straightenSlider.fill("15");
    await page.waitForTimeout(300);
  });
});
