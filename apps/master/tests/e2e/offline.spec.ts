import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Offline Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('should show offline indicator when network is down', async ({ page }) => {
        // Simulate offline
        await page.context().setOffline(true);
        
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
        
        // Restore online
        await page.context().setOffline(false);
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should allow editing photos while offline', async ({ page }) => {
        await page.goto('/albums');
        await page.locator('[data-testid="album-item"]').first().click();
        
        // Go offline
        await page.context().setOffline(true);
        
        // Should still be able to edit
        await page.locator('[data-testid="filmstrip-photo"]').first().click();
        await page.locator('[data-testid="exposure-slider"]').fill('20');
        
        await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved');
        
        // Restore online
        await page.context().setOffline(false);
    });

    test('should queue changes for sync when back online', async ({ page }) => {
        await page.goto('/albums');
        await page.locator('[data-testid="album-item"]').first().click();
        
        // Make edits offline
        await page.context().setOffline(true);
        await page.locator('[data-testid="filmstrip-photo"]').first().click();
        await page.locator('[data-testid="contrast-slider"]').fill('15');
        
        // Come back online
        await page.context().setOffline(false);
        
        // Should show sync indicator
        await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
    });
});
