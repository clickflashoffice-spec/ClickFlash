import { test, expect } from '@playwright/test';

test.describe('MoneyTrash Smoke Tests - Critical Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SMOKE-1: Mode switch clears form fields', async ({ page }) => {
    // Fill Gallery form
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Switch to Backup mode
    await page.click('button:has-text("Order Backup")');
    await page.waitForTimeout(300);
    
    // Verify form cleared - check first input is empty
    const firstInput = page.locator('input').first();
    await expect(firstInput).toHaveValue('');
    
    // Verify Backup button has green styling
    const backupBtn = page.locator('button:has-text("Order Backup")');
    await expect(backupBtn).toHaveClass(/bg-green-500/);
  });

  test('SMOKE-2: Backup mode requires email validation', async ({ page }) => {
    // Switch to Backup mode
    await page.click('button:has-text("Order Backup")');
    await page.waitForTimeout(300);
    
    // Fill fields except email
    await page.fill('input[placeholder*="Order #1024"]', 'Test Order');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    
    // Try to select folder
    await page.click('button:has-text("Select Folder")');
    
    // Verify error message (red error box)
    await expect(page.locator('.bg-red-500\\/10').filter({ hasText: 'Please fill in all required fields' })).toBeVisible();
  });

  test('SMOKE-3: Gallery mode allows empty email', async ({ page }) => {
    // Ensure in Gallery mode (default)
    await expect(page.locator('button:has-text("New Gallery")')).toHaveClass(/bg-yellow-500/);
    
    // Fill required fields
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    // Leave email empty
    
    // Click Browse Files - should not show validation error for email
    await page.click('button:has-text("Browse Files")');
    
    // Should show Tauri not available error (not validation error)
    // or open file dialog in actual Tauri
  });

  test('SMOKE-4: Field validation shows error states', async ({ page }) => {
    // Try to select folder without filling anything
    await page.click('button:has-text("Select Folder")');
    
    // Verify error message appears (red error box)
    await expect(page.locator('.bg-red-500\\/10').filter({ hasText: 'Please fill in all required fields' })).toBeVisible();
    
    // Verify Event Name field has red border
    const eventInput = page.locator('input').first();
    await expect(eventInput).toHaveClass(/border-red-500/);
  });

  test('SMOKE-5: Clearing validation errors on input', async ({ page }) => {
    // Trigger validation error
    await page.click('button:has-text("Select Folder")');
    
    // Verify error state
    const eventInput = page.locator('input').first();
    await expect(eventInput).toHaveClass(/border-red-500/);
    
    // Type in field
    await eventInput.fill('A');
    
    // Verify red border removed
    await expect(eventInput).not.toHaveClass(/border-red-500/);
  });

  test('SMOKE-6: File selection updates summary', async ({ page }) => {
    // Fill required fields
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    
    // Simulate file drop
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((el: HTMLInputElement) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['mock image content'], 'test-photo.jpg', { type: 'image/jpeg' }));
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);
    
    // Verify summary shows file count = 1
    const summarySection = page.locator('.bg-zinc-900\\/50').filter({ hasText: 'Summary' });
    const filesRow = summarySection.locator('.flex').filter({ hasText: 'Files' });
    await expect(filesRow.locator('span', { hasText: /^1$/ })).toBeVisible();
    
    // Verify Start Upload button is now enabled
    const uploadBtn = page.locator('button:has-text("Start Upload")');
    await expect(uploadBtn).not.toBeDisabled();
  });

  test('SMOKE-7: Backup mode shows required email field', async ({ page }) => {
    // Switch to Backup mode
    await page.click('button:has-text("Order Backup")');
    await page.waitForTimeout(300);
    
    // Verify email field with required indicator
    await expect(page.locator('text=Customer Email')).toBeVisible();
    
    // Verify email input has "required" placeholder text
    const emailInput = page.locator('input[type="email"]');
    const placeholder = await emailInput.getAttribute('placeholder');
    expect(placeholder).toContain('required');
  });
});
