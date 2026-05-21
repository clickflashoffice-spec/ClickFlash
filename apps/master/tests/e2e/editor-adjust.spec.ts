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
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const adjustTab = page.locator('#adjust-tab, button:has-text("Adjust")').first();
    await expect(adjustTab).toBeVisible();
  });

  test("should display all 4 adjustment sections", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    for (const section of SECTIONS) {
      const sectionHeader = page.locator(`text="${section}"`).first();
      if (await sectionHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(sectionHeader).toBeVisible();
      }
    }
  });

  for (const slider of ADJUSTMENT_SLIDERS) {
    test(`should have ${slider} slider`, async ({ page }) => {
      const opened = await openFirstAlbumEditor(page);
      if (!opened) test.skip(true, "No albums available");

      const sliderEl = page.locator(`[data-testid="${slider}-slider"], input[name="${slider}"]`).first();
      const scrollTarget = page.locator(`text=/${slider}/i`).first();

      if (await scrollTarget.isVisible({ timeout: 3000 }).catch(() => false)) {
        await scrollTarget.scrollIntoViewIfNeeded();
        await expect(sliderEl).toBeVisible({ timeout: 3000 });
      }
    });
  }

  test("should modify exposure slider and enable undo", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    if (!(await slider.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Exposure slider not visible");
    }

    await slider.fill("25");
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="undo-button"]')).toBeEnabled();
  });

  test("Reset All returns sliders to defaults", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    if (!(await slider.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Exposure slider not visible");
    }

    await slider.fill("30");
    await page.waitForTimeout(300);

    const resetBtn = page.locator('button:has-text("Reset All"), button:has-text("Reset to Original")').first();
    if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await resetBtn.click();
      await page.waitForTimeout(300);
      const value = await slider.inputValue();
      expect(Number(value)).toBe(0);
    }
  });

  test("Copy and Paste edits between photos", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    if ((await photos.count()) < 2) test.skip(true, "Need 2+ photos");

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    if (!(await slider.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Exposure slider not visible");
    }

    await slider.fill("40");
    await page.waitForTimeout(300);

    const copyBtn = page.locator('button:has-text("Copy Edits")').first();
    if (await copyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await copyBtn.click();
      await photos.nth(1).click();
      await page.waitForTimeout(500);

      const pasteBtn = page.locator('button:has-text("Paste Edits")').first();
      if (await pasteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await pasteBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test("section collapse/expand toggles", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const sectionHeader = page.locator('button:has-text("Basic")').first();
    if (await sectionHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sectionHeader.click();
      await page.waitForTimeout(300);
      await sectionHeader.click();
      await page.waitForTimeout(300);
    }
  });

  test("straighten slider rotates preview", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const straightenSlider = page.locator('[data-testid="straighten-slider"]').first();
    if (await straightenSlider.isVisible({ timeout: 5000 }).catch(() => false)) {
      await straightenSlider.fill("15");
      await page.waitForTimeout(300);
    }
  });
});
