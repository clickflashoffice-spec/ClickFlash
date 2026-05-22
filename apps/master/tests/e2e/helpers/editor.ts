import { Page, expect } from "@playwright/test";
import { login } from "./auth";

export async function openFirstAlbumEditor(page: Page): Promise<boolean> {
  await login(page);
  await page.click('button:has-text("Albums")');
  await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 15000 });

  const albumCard = page.locator('[data-testid="album-item"]').first();
  await expect(albumCard).toBeVisible({ timeout: 15000 });

  await albumCard.click();
  await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
  return true;
}

export async function getFilmstripPhotos(page: Page) {
  return page.locator('[data-testid="filmstrip-photo"]');
}

export async function waitForEditorReady(page: Page) {
  await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="filmstrip"]', { timeout: 10000 });
}
