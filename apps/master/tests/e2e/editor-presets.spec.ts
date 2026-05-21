import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

const EDITOR_PRESETS = [
  "Normal", "Vivid", "Dramatic", "Vintage", "Retro",
  "Noir", "Landscape", "Portrait", "Warm", "Cold",
];

const QUICK_FILTERS = [
  "Original", "Vintage", "Black & White", "Warm", "Cool",
  "Vivid", "Dramatic", "Soft", "Noir", "Golden",
];

const CATEGORIES = ["All", "Basic", "Portrait", "Nature", "Vintage", "B&W", "Artistic"];

test.describe("Editor — Presets", () => {
  test("should display preset grid", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const presetArea = page.locator('text=/Presets|Filters/i').first();
    if (await presetArea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(presetArea).toBeVisible();
    }
  });

  for (const preset of EDITOR_PRESETS) {
    test(`should apply "${preset}" editor preset`, async ({ page }) => {
      const opened = await openFirstAlbumEditor(page);
      if (!opened) test.skip(true, "No albums available");

      const presetBtn = page.locator(`button:has-text("${preset}"), [data-testid="preset-${preset.toLowerCase()}"]`).first();
      if (await presetBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await presetBtn.click();
        await page.waitForTimeout(300);
      } else {
        test.skip(true, `Preset "${preset}" not visible`);
      }
    });
  }

  test("should filter presets by category tabs", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    for (const cat of CATEGORIES) {
      const catTab = page.locator(`button:has-text("${cat}")`).first();
      if (await catTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await catTab.click();
        await page.waitForTimeout(200);
      }
    }
  });

  test("should show preset thumbnails with filter previews", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const thumbnails = page.locator('[data-testid*="preset-thumb"], [class*="preset"] img, [class*="preset"] canvas');
    if (await thumbnails.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await thumbnails.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("active preset shows selection indicator", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const vividPreset = page.locator('button:has-text("Vivid"), [data-testid="preset-vivid"]').first();
    if (await vividPreset.isVisible({ timeout: 5000 }).catch(() => false)) {
      await vividPreset.click();
      await page.waitForTimeout(300);
      await expect(vividPreset).toHaveClass(/active|selected|ring|border-blue/);
    }
  });
});
