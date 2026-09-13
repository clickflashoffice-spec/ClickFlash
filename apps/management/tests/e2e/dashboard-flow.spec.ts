import { test, expect } from '@playwright/test';

test.describe('Management Hub - Executive Dashboard & AI Dispatch Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('http://127.0.0.1:5175');

    // Authenticate via Instant CEO preview if on login screen
    const previewBtn = page.getByRole('button', { name: /Instant CEO & Fleet Command Preview/i });
    if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await previewBtn.click();
    }
  });

  test('should display CEO metrics, dynamic pricing, and attraction zones', async ({ page }) => {
    // Assert Header and Title
    await expect(page.getByText('Management Command Hub').first()).toBeVisible({ timeout: 8000 });

    // Assert KPI metrics are visible
    await expect(page.getByText(/Today's Capture Revenue/i)).toBeVisible();
    await expect(page.getByText(/Dynamic Yield Index/i)).toBeVisible();

    // Assert Dynamic Surge & Uptime charts render
    await expect(page.getByText('Revenue & Dynamic Surge Lift')).toBeVisible();
    await expect(page.getByText('LAN Edge Node & Kiosk Uptime')).toBeVisible();

    // Assert Attraction Zones render
    await expect(page.getByText('Apex Hypercoaster Inversion')).toBeVisible();
  });

  test('should trigger AI Swarm photographer dispatch with visual feedback', async ({ page }) => {
    await expect(page.getByText('Management Command Hub').first()).toBeVisible({ timeout: 8000 });

    // Find the dispatch button for the first attraction zone
    const dispatchButton = page.getByRole('button', { name: /AI Dispatch Reinforcements/i }).first();
    await expect(dispatchButton).toBeVisible();

    // Trigger dispatch
    await dispatchButton.click();

    // Assert button state update
    await expect(page.getByText('Photographer Dispatched!')).toBeVisible({ timeout: 3000 });

    // Assert toast confirmation
    await expect(page.getByText(/AI Photographer Dispatched!/i)).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to AI Command Center without errors', async ({ page }) => {
    await expect(page.getByText('Management Command Hub').first()).toBeVisible({ timeout: 8000 });

    // Click on AI Command tab
    const aiTab = page.getByRole('button', { name: /AI Command/i });
    if (await aiTab.isVisible()) {
      await aiTab.click();
      await expect(page).toHaveURL(/.*#\/ai-command/);
    }
  });
});
