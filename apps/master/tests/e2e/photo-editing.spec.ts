import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Photo Editing', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/albums');
        // Navigate to first album with photos
        await page.locator('[data-testid="album-item"]').first().click();
        await page.waitForSelector('[data-testid="photo-viewer"]');
    });

    test('should display photo viewer', async ({ page }) => {
        await expect(page.locator('[data-testid="photo-viewer"]')).toBeVisible();
        await expect(page.locator('[data-testid="filmstrip"]')).toBeVisible();
    });

    test('should navigate photos with arrow keys', async ({ page }) => {
        const firstPhoto = page.locator('[data-testid="filmstrip-photo"]').first();
        await firstPhoto.click();
        
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('[data-testid="active-photo-index"]')).toContainText('1');
        
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('[data-testid="active-photo-index"]')).toContainText('0');
    });

    test('should adjust exposure', async ({ page }) => {
        await page.locator('[data-testid="filmstrip-photo"]').first().click();
        
        const exposureSlider = page.locator('[data-testid="exposure-slider"]');
        await exposureSlider.fill('25');
        
        await expect(page.locator('[data-testid="save-status"]')).toContainText('Modified');
    });

    test('should undo/redo edits', async ({ page }) => {
        await page.locator('[data-testid="filmstrip-photo"]').first().click();
        
        // Make an edit
        await page.locator('[data-testid="exposure-slider"]').fill('30');
        
        // Undo
        await page.keyboard.press('Control+z');
        await expect(page.locator('[data-testid="exposure-slider"]')).toHaveValue('0');
        
        // Redo
        await page.keyboard.press('Control+y');
        await expect(page.locator('[data-testid="exposure-slider"]')).toHaveValue('30');
    });

    test('should crop photo', async ({ page }) => {
        await page.locator('[data-testid="filmstrip-photo"]').first().click();
        
        await page.click('[data-testid="crop-button"]');
        await expect(page.locator('[data-testid="crop-overlay"]')).toBeVisible();
        
        // Apply crop
        await page.click('[data-testid="apply-crop-button"]');
        await expect(page.locator('[data-testid="crop-overlay"]')).not.toBeVisible();
    });

    test('should select multiple photos', async ({ page }) => {
        // Ctrl+click to select multiple
        await page.locator('[data-testid="filmstrip-photo"]').nth(0).click();
        await page.keyboard.down('Control');
        await page.locator('[data-testid="filmstrip-photo"]').nth(2).click();
        await page.keyboard.up('Control');
        
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2');
    });
});
