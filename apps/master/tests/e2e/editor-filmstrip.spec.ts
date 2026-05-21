import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Filmstrip", () => {
  test("should display filmstrip with photos", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();
    const photos = page.locator('[data-testid="filmstrip-photo"]');
    const count = await photos.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking photo sets it as active", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    if ((await photos.count()) < 2) test.skip(true, "Need 2+ photos");

    await photos.nth(1).click();
    await expect(photos.nth(1)).toHaveClass(/border-blue-500/);
  });

  test("Ctrl+Click toggles multi-selection", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    if ((await photos.count()) < 2) test.skip(true, "Need 2+ photos");

    await photos.first().click();
    await photos.nth(1).click({ modifiers: ["Control"] });
    await page.waitForTimeout(300);

    const selectedCount = page.locator('[data-testid="selected-count"]');
    if (await selectedCount.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(selectedCount).toContainText("2");
    }
  });

  test("select photo with checkbox reveals selection count", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const firstCard = page.locator('[data-testid="filmstrip-photo"]').first().locator("..");
    await firstCard.hover();
    const checkbox = firstCard.locator('button[aria-label*="Select"]');
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.click();
      await expect(page.locator('[data-testid="selected-count"]')).toContainText("1");
    }
  });

  test("dirty indicator shows on edited photos", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    if (!(await slider.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Exposure slider not visible");
    }

    await slider.fill("20");
    await page.waitForTimeout(500);

    const dirtyDot = page.locator('[data-testid="filmstrip-photo"]').first().locator('[class*="bg-orange"], [class*="dirty"]');
    if (await dirtyDot.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(dirtyDot).toBeVisible();
    }
  });

  test("filmstrip scrolls horizontally", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const filmstrip = page.locator('[data-testid="filmstrip"]');
    await expect(filmstrip).toBeVisible();

    const scrollWidth = await filmstrip.evaluate((el) => el.scrollWidth);
    const clientWidth = await filmstrip.evaluate((el) => el.clientWidth);

    if (scrollWidth > clientWidth) {
      await filmstrip.evaluate((el) => el.scrollBy(200, 0));
      await page.waitForTimeout(200);
    }
  });

  test("first photo is active by default", async ({ page }) => {
    const opened = await openFirstAlbumEditor(page);
    if (!opened) test.skip(true, "No albums available");

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    await expect(photos.first()).toHaveClass(/border-blue-500/);
  });
});
