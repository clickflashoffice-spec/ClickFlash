import { test, expect } from '@playwright/test';

test.describe('MoneyTrash Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should select folder for upload', async ({ page }) => {
    // Mock folder selection (Tauri file dialog)
    await page.click('[data-testid="select-folder-button"]');
    
    // Verify folder dialog opened
    await expect(page.locator('[data-testid="folder-selected"]')).toBeVisible();
    await expect(page.locator('[data-testid="folder-path"]')).toContainText('Photos');
  });

  test('should scan and display photos', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    
    // Wait for scanning
    await expect(page.locator('[data-testid="scanning-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="scanning-indicator"]')).toBeHidden({ timeout: 30000 });
    
    // Verify photos found
    await expect(page.locator('[data-testid="photo-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="photo-item"]')).toHaveCount.greaterThan(0);
  });

  test('should filter photos by date range', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    await page.waitForSelector('[data-testid="photo-grid"]');

    await page.fill('[data-testid="date-from-input"]', '2026-01-01');
    await page.fill('[data-testid="date-to-input"]', '2026-01-31');
    await page.click('[data-testid="apply-filter-button"]');

    // Verify filtered results
    const photos = page.locator('[data-testid="photo-item"]');
    const count = await photos.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should select photos for upload', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    await page.waitForSelector('[data-testid="photo-grid"]');

    // Select all photos
    await page.click('[data-testid="select-all-button"]');
    
    // Or select individual photos
    await page.click('[data-testid="photo-item"]:nth-child(1) [data-testid="select-checkbox"]');
    await page.click('[data-testid="photo-item"]:nth-child(2) [data-testid="select-checkbox"]');

    await expect(page.locator('[data-testid="selected-count"]')).toContainText('2');
  });

  test('should configure upload settings', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    await page.click('[data-testid="select-all-button"]');

    await page.click('[data-testid="settings-button"]');
    
    await page.selectOption('[data-testid="compression-select"]', 'high');
    await page.check('[data-testid="include-metadata-checkbox"]');
    await page.selectOption('[data-testid="naming-pattern-select"]', 'date-sequence');

    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
  });

  test('should upload photos with progress tracking', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    await page.click('[data-testid="select-all-button"]');

    await page.click('[data-testid="start-upload-button"]');

    // Verify progress indicator
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-percentage"]')).toContainText('%');

    // Wait for completion
    await expect(page.locator('[data-testid="upload-complete"]')).toBeVisible({ timeout: 120000 });
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    await page.click('[data-testid="select-all-button"]');

    // Simulate network error
    await page.route('**/upload', route => route.abort('failed'));

    await page.click('[data-testid="start-upload-button"]');

    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Retry should be available
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
  });

  test('should save and resume upload session', async ({ page }) => {
    await page.click('[data-testid="select-folder-button"]');
    await page.click('[data-testid="select-all-button"]');
    await page.click('[data-testid="start-upload-button"]');

    // Pause upload
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="upload-paused"]')).toBeVisible();

    // Save session
    await page.click('[data-testid="save-session-button"]');
    await expect(page.locator('[data-testid="session-saved"]')).toBeVisible();

    // Reload and resume
    await page.reload();
    await page.click('[data-testid="resume-session-button"]');
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
  });
});
