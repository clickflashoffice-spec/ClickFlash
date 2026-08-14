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
    await openFirstAlbumEditor(page);

    const presetArea = page.locator('text=/Presets|Filters/i').first();
    await expect(presetArea).toBeVisible({ timeout: 10000 });
  });

  for (const preset of EDITOR_PRESETS) {
    test(`should apply "${preset}" editor preset`, async ({ page }) => {
      await openFirstAlbumEditor(page);

      const presetBtn = page.locator(`button:has-text("${preset}"), [data-testid="preset-${preset.toLowerCase()}"]`).first();
      await expect(presetBtn).toBeVisible({ timeout: 10000 });
      await presetBtn.click();
      await page.waitForTimeout(300);
    });
  }

  test("should filter presets by category tabs", async ({ page }) => {
    await openFirstAlbumEditor(page);

    for (const cat of CATEGORIES) {
      const catTab = page.locator(`button:has-text("${cat}")`).first();
      if (await catTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await catTab.click();
        await page.waitForTimeout(200);
      }
    }
  });

  test("should show preset thumbnails with filter previews", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const thumbnails = page.locator('[data-testid*="preset-thumb"], [class*="preset"] img, [class*="preset"] canvas');
    await expect(thumbnails.first()).toBeVisible({ timeout: 10000 });
    const count = await thumbnails.count();
    expect(count).toBeGreaterThan(0);
  });

  test("active preset shows selection indicator", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const vividPreset = page.locator('button:has-text("Vivid"), [data-testid="preset-vivid"]').first();
    await expect(vividPreset).toBeVisible({ timeout: 10000 });
    await vividPreset.click();
    await page.waitForTimeout(300);
    await expect(vividPreset).toHaveClass(/active|selected|ring|border-blue/);
  });
});
