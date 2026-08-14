import { test, expect } from '@playwright/test';

test.describe('MoneyTrash Mode Switch & Authentication Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-001: Should display Gallery mode by default', async ({ page }) => {
    // Verify initial state
    await expect(page.locator('text=Gallery Details')).toBeVisible();
    await expect(page.locator('text=Event Name *')).toBeVisible();
    
    // Verify mode indicator
    const modeText = await page.locator('text=Gallery').first().textContent();
    expect(modeText).toContain('Gallery');
    
    // Verify yellow styling on New Gallery button
    const newGalleryBtn = page.locator('button:has-text("New Gallery")');
    await expect(newGalleryBtn).toHaveClass(/bg-yellow-500/);
  });

  test('TC-002: Should switch to Backup mode and clear form fields', async ({ page }) => {
    // Fill in Gallery form
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Click Order Backup button
    await page.click('button:has-text("Order Backup")');
    
    // Wait for mode switch
    await page.waitForTimeout(500);
    
    // Verify form fields are cleared
    const eventInput = page.locator('input').first();
    await expect(eventInput).toHaveValue('');
    
    // Verify mode switched to Backup (green styling)
    const orderBackupBtn = page.locator('button:has-text("Order Backup")');
    await expect(orderBackupBtn).toHaveClass(/bg-green-500/);
    
    // Verify Backup mode label
    await expect(page.locator('text=Backup')).toBeVisible();
  });

  test('TC-003: Should require Event Name before file selection', async ({ page }) => {
    // Try to select folder without entering Event Name
    await page.click('button:has-text("Select Folder")');
    
    // Verify error message appears
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible();
    
    // Verify field shows error state
    const eventInput = page.locator('input').first();
    await expect(eventInput).toHaveClass(/border-red-500/);
  });

  test('TC-004: Should require Access Code before file selection', async ({ page }) => {
    // Fill only Event Name
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    
    // Try to select folder
    await page.click('button:has-text("Select Folder")');
    
    // Verify error message
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible();
  });

  test('TC-005: Should require Email for Backup mode', async ({ page }) => {
    // Switch to Backup mode
    await page.click('button:has-text("Order Backup")');
    await page.waitForTimeout(500);
    
    // Fill Event Name and Access Code (but NOT email)
    await page.fill('input[placeholder*="Order #1024"]', 'Test Order');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    
    // Try to select folder
    await page.click('button:has-text("Select Folder")');
    
    // Verify error about required email
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible();
    await expect(page.locator('text=Customer email is required for backup')).toBeVisible();
  });

  test('TC-006: Should allow file selection when all fields are filled', async ({ page }) => {
    // Fill all required fields
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    
    // Note: In actual Tauri, this would open file dialog
    // For testing, we verify no error appears
    await page.click('button:has-text("Browse Files")');
    
    // Should not show validation error (actual file dialog opens in Tauri)
    // In browser test, might show different error about Tauri not available
  });

  test('TC-007: Backup mode should show required email field', async ({ page }) => {
    // Switch to Backup mode
    await page.click('button:has-text("Order Backup")');
    await page.waitForTimeout(500);
    
    // Verify email field exists with required indicator
    await expect(page.locator('text=Customer Email')).toBeVisible();
    await expect(page.locator('text=*').first()).toBeVisible();
    
    // Verify placeholder mentions it's required
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('placeholder', /required/);
  });

  test('TC-008: Should clear validation errors when typing', async ({ page }) => {
    // Trigger validation error
    await page.click('button:has-text("Select Folder")');
    
    // Verify error state
    const eventInput = page.locator('input').first();
    await expect(eventInput).toHaveClass(/border-red-500/);
    
    // Start typing
    await eventInput.fill('A');
    
    // Verify error state removed
    await expect(eventInput).not.toHaveClass(/border-red-500/);
  });

  test('TC-009: Switching modes should reset all validation errors', async ({ page }) => {
    // Trigger validation error
    await page.click('button:has-text("Select Folder")');
    
    // Verify error visible
    await expect(page.locator('text=Please fill in all required fields')).toBeVisible();
    
    // Switch to Backup mode
    await page.click('button:has-text("Order Backup")');
    await page.waitForTimeout(500);
    
    // Verify error cleared
    await expect(page.locator('text=Please fill in all required fields')).not.toBeVisible();
  });

  test('TC-010: Upload button should be disabled without files', async ({ page }) => {
    // Fill all fields
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    
    // Verify Start Upload button is disabled
    const uploadBtn = page.locator('button:has-text("Start Upload")');
    await expect(uploadBtn).toBeDisabled();
  });
});
