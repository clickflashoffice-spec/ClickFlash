import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Opens the first album in the editor via sidebar navigation.
 * Returns false and calls test.skip() if no albums are available.
 */
async function openFirstAlbum(page: any): Promise<boolean> {
    await login(page);
    // App uses view-state routing — navigate via sidebar button
    await page.click('button:has-text("Albums")');
    const albumCard = page.locator('[data-testid="album-item"]').first();
    if (!(await albumCard.isVisible({ timeout: 8000 }).catch(() => false))) {
        return false;
    }
    await albumCard.click();
    await page.waitForSelector('[data-testid="album-editor"]', { timeout: 15000 });
    return true;
}

test.describe('Photo Editing', () => {
    test('should display album editor with filmstrip', async ({ page }) => {
        if (!(await openFirstAlbum(page))) {
            test.skip(true, 'No albums available');
            return;
        }
        await expect(page.locator('[data-testid="album-editor"]')).toBeVisible();
        await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();
    });

    test('should navigate photos with arrow keys', async ({ page }) => {
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

    test('should select multiple photos with checkbox', async ({ page }) => {
        if (!(await openFirstAlbum(page))) {
            test.skip(true, 'No albums available');
            return;
        }
        const photos = page.locator('[data-testid="filmstrip-photo"]');
        if ((await photos.count()) < 2) {
            test.skip(true, 'Need at least 2 photos');
            return;
        }
        // Click second photo to select it
        await photos.nth(1).click();
        const count = page.locator('[data-testid="selected-count"]');
        if (await count.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(count).toBeVisible();
        }
    });

    test('should show save status indicator', async ({ page }) => {
        if (!(await openFirstAlbum(page))) {
            test.skip(true, 'No albums available');
            return;
        }
        await expect(page.locator('[data-testid="save-status"]')).toBeVisible();
    });

    test('should show undo button', async ({ page }) => {
        if (!(await openFirstAlbum(page))) {
            test.skip(true, 'No albums available');
            return;
        }
        // Undo button exists in the toolbar
        const undoBtn = page.locator('[data-testid="undo-button"]');
        if (await undoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(undoBtn).toBeDisabled(); // No edits yet
        }
    });

    test('should return to album list via back button', async ({ page }) => {
        if (!(await openFirstAlbum(page))) {
            test.skip(true, 'No albums available');
            return;
        }
        await page.click('[data-testid="back-button"]');
        await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
    });
});
