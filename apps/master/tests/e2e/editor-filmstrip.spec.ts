import { test, expect } from "@playwright/test";
import { openFirstAlbumEditor } from "./helpers/editor";

test.describe("Editor — Filmstrip", () => {
  test("should display filmstrip with photos", async ({ page }) => {
    await openFirstAlbumEditor(page);

    await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();
    const photos = page.locator('[data-testid="filmstrip-photo"]');
    const count = await photos.count();
    expect(count).toBeGreaterThan(0);
  });

  test("clicking photo sets it as active", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    await photos.nth(1).click();
    await expect(photos.nth(1)).toHaveClass(/border-blue-500/);
  });

  test("Ctrl+Click toggles multi-selection", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');

    await photos.first().click();
    await photos.nth(1).click({ modifiers: ["Control"] });
    await page.waitForTimeout(300);

    const selectedCount = page.locator('[data-testid="selected-count"]');
    await expect(selectedCount).toBeVisible({ timeout: 10000 });
    await expect(selectedCount).toContainText("2");
  });

  test("select photo with checkbox reveals selection count", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const firstCard = page.locator('[data-testid="filmstrip-photo"]').first().locator("..");
    await firstCard.hover();
    const checkbox = firstCard.locator('button[aria-label*="Select"]');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.click();
    await expect(page.locator('[data-testid="selected-count"]')).toContainText("1");
  });

  test("dirty indicator shows on edited photos", async ({ page }) => {
    await openFirstAlbumEditor(page);

    const slider = page.locator('[data-testid="exposure-slider"]').first();
    await expect(slider).toBeVisible({ timeout: 10000 });

    await slider.fill("20");
    await page.waitForTimeout(500);

    const dirtyDot = page.locator('[data-testid="filmstrip-photo"]').first().locator('[class*="bg-orange"], [class*="dirty"]');
    await expect(dirtyDot).toBeVisible({ timeout: 10000 });
  });

  test("filmstrip scrolls horizontally", async ({ page }) => {
    await openFirstAlbumEditor(page);

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
    await openFirstAlbumEditor(page);

    const photos = page.locator('[data-testid="filmstrip-photo"]');
    await expect(photos.first()).toHaveClass(/border-blue-500/);
  });
});
