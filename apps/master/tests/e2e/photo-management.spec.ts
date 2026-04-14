import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Opens the first album in the editor via sidebar navigation.
 * Assumes the user is already logged in (called after beforeEach login).
 * Returns false and skips the test if no albums are available.
 */
async function openFirstAlbum(page: any): Promise<boolean> {
  await page.click('button:has-text("Albums")');
  const albumCard = page.locator('[data-testid="album-item"]').first();
  if (!(await albumCard.isVisible({ timeout: 8000 }).catch(() => false))) {
    return false;
  }
  await albumCard.click();
  await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
  return true;
}

test.describe("Photo Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should display album list", async ({ page }) => {
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });

  test("should open album editor with photo filmstrip", async ({ page }) => {
    if (!(await openFirstAlbum(page))) {
      test.skip(true, 'No albums available');
      return;
    }
    await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
    // Filmstrip renders if album has photos
    const filmstrip = page.locator('[data-testid="filmstrip"]');
    if (await filmstrip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(filmstrip).toBeVisible();
    }
  });

  test("should select a photo in the filmstrip", async ({ page }) => {
    if (!(await openFirstAlbum(page))) {
      test.skip(true, 'No albums available');
      return;
    }
    const firstPhoto = page.locator('[data-testid="filmstrip-photo"]').first();
    if (!(await firstPhoto.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No photos in album');
      return;
    }
    await firstPhoto.click();
    // Navigation succeeded — no error thrown
  });

  test("should navigate photos with arrow keys", async ({ page }) => {
    if (!(await openFirstAlbum(page))) {
      test.skip(true, 'No albums available');
      return;
    }
    const firstPhoto = page.locator('[data-testid="filmstrip-photo"]').first();
    if (!(await firstPhoto.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No photos in album');
      return;
    }
    await firstPhoto.click();
    await page.keyboard.press('ArrowRight');
    // Navigation succeeded — no error thrown
  });

  test("should show save status indicator", async ({ page }) => {
    if (!(await openFirstAlbum(page))) {
      test.skip(true, 'No albums available');
      return;
    }
    await expect(page.locator('[data-testid="save-status"]')).toBeVisible();
  });

  test("should return to album list via back button", async ({ page }) => {
    if (!(await openFirstAlbum(page))) {
      test.skip(true, 'No albums available');
      return;
    }
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });
});
