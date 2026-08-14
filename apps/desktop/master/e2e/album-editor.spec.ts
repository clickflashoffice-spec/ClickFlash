import { test, expect } from '@playwright/test';

/**
 * Album Editor E2E Tests
 * 
 * These tests cover the critical user workflows in the album editor:
 * 1. Navigation and photo selection
 * 2. Basic editing (brightness, contrast)
 * 3. Crop workflow
 * 4. Zoom and pan
 * 5. Batch operations
 * 6. Export workflow
 */

test.describe('Album Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the album editor with a test album
    await page.goto('/albums/test-album-123/edit');
    
    // Wait for the editor to load
    await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 30000 });
  });

  test.describe('Navigation', () => {
    test('should display filmstrip with photos', async ({ page }) => {
      const filmstrip = page.getByRole('region', { name: /photo filmstrip/i });
      await expect(filmstrip).toBeVisible();
      
      // Check that thumbnails are rendered
      const thumbnails = page.getByRole('option');
      await expect(thumbnails.first()).toBeVisible();
    });

    test('should navigate between photos using arrow keys', async ({ page }) => {
      // Press right arrow to go to next photo
      await page.keyboard.press('ArrowRight');
      
      // Check that a different photo is now active
      const activePhoto = page.locator('[aria-selected="true"]').first();
      await expect(activePhoto).toBeVisible();
    });

    test('should select multiple photos with Ctrl+click', async ({ page }) => {
      const firstPhoto = page.getByRole('option').first();
      const secondPhoto = page.getByRole('option').nth(1);
      
      await firstPhoto.click();
      await secondPhoto.click({ modifiers: ['Control'] });
      
      // Check selection count
      const selectionText = page.getByText(/\d+ selected/i);
      await expect(selectionText).toContainText('2 Selected');
    });
  });

  test.describe('Zoom and Pan', () => {
    test('should zoom in with Ctrl++', async ({ page }) => {
      // Get initial zoom level
      const zoomIndicator = page.getByRole('status', { name: /zoom level/i });
      await expect(zoomIndicator).toContainText('100%');
      
      // Zoom in
      await page.keyboard.press('Control+Equal');
      
      // Check zoom increased
      await expect(zoomIndicator).not.toContainText('100%');
    });

    test('should zoom with mouse wheel', async ({ page }) => {
      const canvas = page.getByRole('img');
      
      // Zoom in with Ctrl+wheel
      await canvas.hover();
      await page.mouse.wheel(0, -100, { modifiers: ['Control'] });
      
      // Verify zoom changed
      const zoomIndicator = page.getByRole('status', { name: /zoom level/i });
      await expect(zoomIndicator).not.toContainText('100%');
    });

    test('should reset zoom with Ctrl+0', async ({ page }) => {
      // First zoom in
      await page.keyboard.press('Control+Equal');
      
      // Then reset
      await page.keyboard.press('Control+0');
      
      // Check back to 100%
      const zoomIndicator = page.getByRole('status', { name: /zoom level/i });
      await expect(zoomIndicator).toContainText('100%');
    });

    test('should pan with space+drag', async ({ page }) => {
      // First zoom in to enable panning
      await page.keyboard.press('Control+Equal');
      await page.keyboard.press('Control+Equal');
      
      const canvas = page.getByRole('img');
      
      // Press space and drag
      await page.keyboard.down('Space');
      await canvas.dragTo(canvas, { sourcePosition: { x: 200, y: 200 }, targetPosition: { x: 100, y: 100 } });
      await page.keyboard.up('Space');
      
      // Verify panned state (zoom indicator should show "panned")
      const zoomIndicator = page.getByRole('status', { name: /zoom level/i });
      await expect(zoomIndicator).toContainText('panned');
    });

    test('should show magnifier with Z key', async ({ page }) => {
      const canvas = page.getByRole('img');
      await canvas.hover();
      
      // Press and hold Z
      await page.keyboard.down('z');
      
      // Check magnifier appears
      const magnifier = page.locator('[aria-label*="magnifier"], .loupe-tool');
      await expect(magnifier).toBeVisible();
      
      // Release Z
      await page.keyboard.up('z');
      
      // Check magnifier disappears
      await expect(magnifier).not.toBeVisible();
    });
  });

  test.describe('Editing', () => {
    test('should adjust brightness', async ({ page }) => {
      // Navigate to Adjust tab
      await page.getByRole('tab', { name: /adjust/i }).click();
      
      // Find brightness slider
      const brightnessSlider = page.getByLabel(/brightness/i);
      await expect(brightnessSlider).toBeVisible();
      
      // Adjust brightness
      await brightnessSlider.fill('20');
      
      // Verify photo is marked as edited
      const editedBadge = page.getByLabel(/has edits/i);
      await expect(editedBadge).toBeVisible();
    });

    test('should undo and redo changes', async ({ page }) => {
      // Make an edit first
      await page.getByRole('tab', { name: /adjust/i }).click();
      await page.getByLabel(/brightness/i).fill('20');
      
      // Undo
      await page.keyboard.press('Control+z');
      
      // Redo
      await page.keyboard.press('Control+y');
      
      // Verify edit is restored (edited badge still visible)
      const editedBadge = page.getByLabel(/has edits/i);
      await expect(editedBadge).toBeVisible();
    });

    test('should copy and paste edits', async ({ page }) => {
      // Edit first photo
      await page.getByRole('tab', { name: /adjust/i }).click();
      await page.getByLabel(/brightness/i).fill('20');
      
      // Copy edits
      await page.keyboard.press('Control+c');
      
      // Select second photo
      await page.getByRole('option').nth(1).click();
      
      // Paste edits
      await page.keyboard.press('Control+v');
      
      // Verify second photo has edits
      const editedBadge = page.getByRole('option').nth(1).getByLabel(/has edits/i);
      await expect(editedBadge).toBeVisible();
    });
  });

  test.describe('Crop', () => {
    test('should enter crop mode', async ({ page }) => {
      // Click crop tab
      await page.getByRole('tab', { name: /crop/i }).click();
      
      // Check crop overlay appears
      const cropOverlay = page.locator('[data-testid="crop-overlay"], .crop-overlay');
      await expect(cropOverlay).toBeVisible();
    });

    test('should apply crop', async ({ page }) => {
      // Enter crop mode
      await page.getByRole('tab', { name: /crop/i }).click();
      
      // Apply crop
      await page.getByRole('button', { name: /apply crop/i }).click();
      
      // Verify crop applied (photo marked as edited)
      const editedBadge = page.getByLabel(/has edits/i);
      await expect(editedBadge).toBeVisible();
    });

    test('should cancel crop with Escape', async ({ page }) => {
      // Enter crop mode
      await page.getByRole('tab', { name: /crop/i }).click();
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Verify crop overlay removed
      const cropOverlay = page.locator('[data-testid="crop-overlay"]');
      await expect(cropOverlay).not.toBeVisible();
    });
  });

  test.describe('Save and Export', () => {
    test('should save changes', async ({ page }) => {
      // Make an edit
      await page.getByRole('tab', { name: /adjust/i }).click();
      await page.getByLabel(/brightness/i).fill('20');
      
      // Save
      await page.keyboard.press('Control+s');
      
      // Verify save indicator
      const saveIndicator = page.getByText(/saving|saved/i);
      await expect(saveIndicator).toBeVisible();
    });

    test('should show export dialog', async ({ page }) => {
      // Click export button
      await page.getByRole('button', { name: /export|batch export/i }).click();
      
      // Verify export dialog or progress appears
      const exportDialog = page.getByText(/exporting|export complete/i).or(
        page.getByRole('dialog', { name: /export/i })
      );
      await expect(exportDialog).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check main regions
      await expect(page.getByRole('complementary', { name: /editor controls/i })).toBeVisible();
      await expect(page.getByRole('region', { name: /photo filmstrip/i })).toBeVisible();
      
      // Check tabs
      const tabs = page.getByRole('tab');
      await expect(tabs).toHaveCount(5); // adjust, crop, retouch, ai, analytics
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through controls
      await page.keyboard.press('Tab');
      
      // Check focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });
});

test.describe('Album Editor - Large Albums', () => {
  test('should handle albums with 500+ photos', async ({ page }) => {
    // Navigate to large album
    await page.goto('/albums/large-album-500/edit');
    
    // Wait for load
    await page.waitForSelector('[data-testid="editor-canvas"]', { timeout: 30000 });
    
    // Verify filmstrip is responsive
    const filmstrip = page.getByRole('region', { name: /photo filmstrip/i });
    await expect(filmstrip).toBeVisible();
    
    // Scroll to end should be smooth
    await page.evaluate(() => {
      const filmstrip = document.querySelector('[role="listbox"]');
      if (filmstrip) filmstrip.scrollLeft = filmstrip.scrollWidth;
    });
    
    // Verify last photo is accessible
    const lastPhoto = page.getByRole('option').last();
    await expect(lastPhoto).toBeVisible();
  });
});
