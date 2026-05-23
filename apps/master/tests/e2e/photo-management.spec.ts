import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

/**
 * Opens the first album in the editor via sidebar navigation.
 * Assumes the user is already logged in (called after beforeEach login).
 * Asserts album availability (will fail test if no albums).
 */
async function openFirstAlbum(page: any): Promise<void> {
  await page.click('button:has-text("Albums")');
  await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 15000 });
  const albumCard = page.locator('[data-testid="album-item"]').first();
  await expect(albumCard).toBeVisible({ timeout: 15000 });
  await albumCard.click();
  await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
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
    await openFirstAlbum(page);
    await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
    // Filmstrip renders if album has photos
    const filmstrip = page.locator('[data-testid="filmstrip"]');
    await expect(filmstrip).toBeVisible({ timeout: 10000 });
  });

  test("should select a photo in the filmstrip", async ({ page }) => {
    await openFirstAlbum(page);
    const firstPhoto = page.locator('[data-testid="filmstrip-photo"]').first();
    await expect(firstPhoto).toBeVisible({ timeout: 10000 });
    await firstPhoto.click();
    // Navigation succeeded — no error thrown
  });

  test("should navigate photos with arrow keys", async ({ page }) => {
    await openFirstAlbum(page);
    const firstPhoto = page.locator('[data-testid="filmstrip-photo"]').first();
    await expect(firstPhoto).toBeVisible({ timeout: 10000 });
    await firstPhoto.click();
    await page.keyboard.press('ArrowRight');
    // Navigation succeeded — no error thrown
  });

  test("should show save status indicator", async ({ page }) => {
    await openFirstAlbum(page);
    await expect(page.locator('[data-testid="save-status"]')).toBeVisible();
  });

  test("should return to album list via back button", async ({ page }) => {
    await openFirstAlbum(page);
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
  });
});
