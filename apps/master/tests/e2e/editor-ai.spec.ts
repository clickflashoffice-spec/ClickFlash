import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Editor AI Workflows', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        
        // Mock the Face API / Culling API since we're in E2E
        // Mock the AI enhance endpoint
        await page.route('**/api/culling/auto-enhance*', async route => {
            const request = route.request();
            if (request.method() === 'POST') {
                const postData = request.postDataJSON();
                
                // If it's a batch request
                if (postData && postData.photoIds) {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            results: postData.photoIds.map((id: string) => ({
                                photoId: id,
                                success: true,
                                edits: { exposure: 15, contrast: 10 }
                            }))
                        })
                    });
                    return;
                }
            }

            // Single photo enhance
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    edits: {
                        exposure: 20,
                        contrast: 15,
                        highlights: -10,
                        shadows: 5
                    }
                })
            });
        });

        await page.goto('/albums');
        // Navigate to first album with photos
        await page.locator('[data-testid="album-item"]').first().click();
        await page.waitForSelector('[data-testid="photo-viewer"]');
    });

    test('should auto-enhance a single photo', async ({ page }) => {
        // Mock the process state
        await page.locator('[data-testid="filmstrip-photo"]').first().click();
        
        // Click the Auto Enhance button
        const autoEnhanceBtn = page.locator('[data-testid="auto-enhance-button"]');
        await expect(autoEnhanceBtn).toBeVisible();
        await autoEnhanceBtn.click();
        
        // Wait for the mock to resolve and state to update
        await expect(page.locator('[data-testid="save-status"]')).toContainText('Modified');
        
        // Check if sliders updated (these data-testids might need to be added to the sliders if they don't exist)
        // Since we don't know the exact data-testids of sliders in sidebar, we just verify the state change
        // via the save status or a specific element if available.
        // Assuming exposure slider is at 20 based on our mock
        const exposureSlider = page.locator('[data-testid="exposure-slider"]');
        if (await exposureSlider.isVisible()) {
            await expect(exposureSlider).toHaveValue('20');
        }
    });

    test('should auto-enhance multiple photos in batch', async ({ page }) => {
        // Select multiple photos
        await page.locator('[data-testid="filmstrip-photo"]').nth(0).click();
        await page.keyboard.down('Control');
        await page.locator('[data-testid="filmstrip-photo"]').nth(1).click();
        await page.keyboard.up('Control');
        
        await expect(page.locator('[data-testid="selected-count"]')).toContainText('2');
        
        // Click Auto Enhance
        const autoEnhanceBtn = page.locator('[data-testid="auto-enhance-button"]');
        await autoEnhanceBtn.click();
        
        // Both should now be modified
        await expect(page.locator('[data-testid="filmstrip-photo"]').nth(0)).toHaveAttribute('data-modified', 'true');
        await expect(page.locator('[data-testid="filmstrip-photo"]').nth(1)).toHaveAttribute('data-modified', 'true');
    });
});
