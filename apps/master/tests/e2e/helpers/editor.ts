import { Page } from "@playwright/test";
import { login } from "./auth";

export async function openFirstAlbumEditor(page: Page): Promise<boolean> {
  await login(page);
  await page.click('button:has-text("Albums")');

  const albumCard = page.locator('[data-testid="album-item"]').first();
  if (!(await albumCard.isVisible({ timeout: 10000 }).catch(() => false))) {
    return false;
  }

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
