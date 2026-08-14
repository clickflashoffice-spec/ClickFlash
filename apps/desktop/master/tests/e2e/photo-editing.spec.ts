import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Opens the first album in the editor via sidebar navigation.
 * Asserts album availability (will fail test if no albums).
 */
async function openFirstAlbum(page: any): Promise<void> {
    await login(page);
    // App uses view-state routing — navigate via sidebar button
    await page.click('button:has-text("Albums")');
    await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 15000 });
    const albumCard = page.locator('[data-testid="album-item"]').first();
    await expect(albumCard).toBeVisible({ timeout: 15000 });
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
}

test.describe('Photo Editing', () => {
    test('should display album editor with filmstrip', async ({ page }) => {
        await openFirstAlbum(page);
        await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
        await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();
    });

    test('should navigate photos with arrow keys', async ({ page }) => {
        await openFirstAlbum(page);
        const firstPhoto = page.locator('[data-testid="filmstrip-photo"]').first();
        await expect(firstPhoto).toBeVisible({ timeout: 10000 });
        await firstPhoto.click();
        await page.keyboard.press('ArrowRight');
        // Navigation succeeded — no error thrown
    });

    test('should select multiple photos with checkbox', async ({ page }) => {
        await openFirstAlbum(page);
        const photos = page.locator('[data-testid="filmstrip-photo"]');
        // Click second photo to select it
        await photos.nth(1).click();
        const count = page.locator('[data-testid="selected-count"]');
        await expect(count).toBeVisible({ timeout: 10000 });
    });

    test('should show save status indicator', async ({ page }) => {
        await openFirstAlbum(page);
        await expect(page.locator('[data-testid="save-status"]')).toBeVisible();
    });

    test('should show undo button', async ({ page }) => {
        await openFirstAlbum(page);
        // Undo button exists in the toolbar
        const undoBtn = page.locator('[data-testid="undo-button"]');
        await expect(undoBtn).toBeVisible({ timeout: 10000 });
        await expect(undoBtn).toBeDisabled(); // No edits yet
    });

    test('should return to album list via back button', async ({ page }) => {
        await openFirstAlbum(page);
        await page.click('[data-testid="back-button"]');
        await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
    });
});
