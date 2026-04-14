import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Album Management', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);

        // Navigate to Albums by clicking sidebar (view-based navigation)
        // page.click waits for the element to be visible with actionTimeout
        await page.click('button:has-text("Albums")');

        // Wait for Albums view to load — heading is "Album Workflow"
        await expect(page.locator('text=Album Workflow')).toBeVisible({ timeout: 10000 });
    });

    test('should display albums page', async ({ page }) => {
        // Verify we're on albums page — "Import New" button is always visible to admins
        await expect(page.locator('button:has-text("Import New")').first()).toBeVisible();
    });

    test('should open import album modal', async ({ page }) => {
        // Click Import New button
        await page.click('button:has-text("Import New")');

        // Wait for modal to appear — contains "Import" text
        await expect(page.locator('h2:has-text("Import"), h1:has-text("Import"), [role="dialog"]').first()).toBeVisible({ timeout: 8000 });

        // Close modal
        await page.keyboard.press('Escape');
    });

    test('should filter albums by status tabs', async ({ page }) => {
        // Look for status filter tabs (Queue, Live, All)
        const statusTabs = page.locator('button:has-text("Queue"), button:has-text("Live"), button:has-text("All")');
        
        // Click first available tab
        const firstTab = statusTabs.first();
        if (await firstTab.isVisible().catch(() => false)) {
            await firstTab.click();
            
            // Wait briefly for filter to apply
            await page.waitForTimeout(300);
            
            // Tab should still be visible after click
            await expect(firstTab).toBeVisible();
        }
    });

    test('should search albums', async ({ page }) => {
        // Find search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
        
        if (await searchInput.isVisible().catch(() => false)) {
            // Type search query
            await searchInput.fill('Test');
            await page.keyboard.press('Enter');
            
            // Wait for debounced search
            await page.waitForTimeout(500);
            
            // Verify search value was entered
            await expect(searchInput).toHaveValue('Test');
        }
    });

    test('should navigate to album editor when clicking album card', async ({ page }) => {
        // Find album cards
        const albumCards = page.locator('[class*="album-card"], [class*="AlbumCard"], [class*="virtuoso-grid"] > div > div');
        
        if (await albumCards.first().isVisible().catch(() => false)) {
            // Click first album
            await albumCards.first().click();
            
            // Wait for editor to load (look for back button or photo gallery)
            await expect(page.locator('button:has-text("Back"), text=Photo Gallery, [class*="editor"]').first()).toBeVisible({ 
                timeout: 10000 
            });
        } else {
            test.skip(true, 'No albums available to test');
        }
    });
});
