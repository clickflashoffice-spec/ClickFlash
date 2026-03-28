import { test, expect } from '@playwright/test';

test.describe('MoneyTrash File Selection & Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Fill required fields for all tests
    await page.fill('input[placeholder*="Summer Wedding"]', 'Test Event');
    await page.fill('input[placeholder*="WED-2026"]', 'TEST-123');
    await page.fill('input[type="email"]', 'test@example.com');
  });

  test('TC-F01: Should display Browse Files and Select Folder buttons', async ({ page }) => {
    // Verify both buttons are visible
    await expect(page.locator('button:has-text("Browse Files")')).toBeVisible();
    await expect(page.locator('button:has-text("Select Folder")')).toBeVisible();
    
    // Verify drag & drop area
    await expect(page.locator('text=Drag & Drop Photos')).toBeVisible();
  });

  test('TC-F02: Should show file type restrictions', async ({ page }) => {
    // Verify supported formats displayed
    await expect(page.locator('text=JPEG, PNG, HEIC')).toBeVisible();
    await expect(page.locator('text=Max 50MB per file')).toBeVisible();
  });

  test('TC-F03: Should display empty state when no files selected', async ({ page }) => {
    // Verify upload icon in dropzone is shown (the large one)
    await expect(page.locator('.lucide-upload.w-10')).toBeVisible();
    
    // Verify file count is 0 in Summary section
    await expect(page.locator('text=Files').first()).toBeVisible();
    const filesCount = await page.locator('span.text-white.font-medium').first().textContent();
    expect(filesCount?.trim()).toBe('0');
    
    // Verify total size is 0 B in Summary
    const summarySection = page.locator('.bg-zinc-900\/50').filter({ hasText: 'Summary' });
    await expect(summarySection.locator('text=0 B')).toBeVisible();
  });

  test('TC-F04: Should update summary when files are added', async ({ page }) => {
    // Mock file selection via drag and drop
    const fileInput = page.locator('input[type="file"]');
    
    // Create a mock file
    await fileInput.evaluate((el: HTMLInputElement) => {
      const file = new File(['mock image content'], 'test-photo.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      el.files = dataTransfer.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    // Wait for file to be processed
    await page.waitForTimeout(500);
    
    // Verify file count updated in Summary
    const summarySection = page.locator('.bg-zinc-900\/50').filter({ hasText: 'Summary' });
    const filesCount = await summarySection.locator('span.text-white.font-medium').first().textContent();
    expect(filesCount?.trim()).toBe('1');
    
    // Verify total size updated (not 0 B)
    const sizeText = await summarySection.locator('text=/\\d+ B|KB|MB/').first().textContent();
    expect(sizeText).not.toBe('0 B');
  });

  test('TC-F05: Should show clear all button when files exist', async ({ page }) => {
    // Add a mock file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((el: HTMLInputElement) => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);
    
    // Verify Clear All button appears
    await expect(page.locator('button:has-text("Clear All")')).toBeVisible();
  });

  test('TC-F06: Should clear all files when Clear All clicked', async ({ page }) => {
    // Add files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((el: HTMLInputElement) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['c1'], 'test1.jpg', { type: 'image/jpeg' }));
      dt.items.add(new File(['c2'], 'test2.jpg', { type: 'image/jpeg' }));
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);
    
    // Verify files added - check in Summary section
    const summarySection = page.locator('.bg-zinc-900\/50').filter({ hasText: 'Summary' });
    const filesCount = await summarySection.locator('span.text-white.font-medium').first().textContent();
    expect(filesCount?.trim()).toBe('2');
    
    // Click Clear All
    await page.click('button:has-text("Clear All")');
    await page.waitForTimeout(500);
    
    // Verify back to empty state
    await expect(page.locator('text=0 B')).toBeVisible();
  });

  test('TC-F07: Should show drag active state', async ({ page }) => {
    // Simulate drag over
    const dropzone = page.locator('[role="presentation"]').first();
    await dropzone.dispatchEvent('dragenter');
    
    // Verify drag active styling (would need actual drag-drop implementation)
    await expect(page.locator('text=Drop Files Here')).toBeVisible();
  });

  test('TC-F08: Should show Add Files button in queue view', async ({ page }) => {
    // Add initial file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((el: HTMLInputElement) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['c1'], 'test1.jpg', { type: 'image/jpeg' }));
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);
    
    // Verify Add Files and Add Folder buttons in queue view
    await expect(page.locator('button:has-text("Add Files")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Folder")')).toBeVisible();
  });

  test('TC-F09: Upload button should enable when files present', async ({ page }) => {
    // Initially disabled
    const uploadBtn = page.locator('button:has-text("Start Upload")');
    await expect(uploadBtn).toBeDisabled();
    
    // Add file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((el: HTMLInputElement) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['c1'], 'test1.jpg', { type: 'image/jpeg' }));
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await page.waitForTimeout(500);
    
    // Now enabled
    await expect(uploadBtn).not.toBeDisabled();
  });

  test('TC-F10: Should handle unsupported file types gracefully', async ({ page }) => {
    // Try to upload text file via drag-drop simulation
    const dropzone = page.locator('div').filter({ hasText: 'Drag & Drop Photos' }).first();
    
    // The app should reject non-image files
    // This would show an error message in the file rejections area
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((el: HTMLInputElement) => {
      const dt = new DataTransfer();
      dt.items.add(new File(['not an image'], 'test.txt', { type: 'text/plain' }));
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    // File should be rejected - app shows error
    await expect(page.locator('text=File type must be')).toBeVisible();
  });
});
