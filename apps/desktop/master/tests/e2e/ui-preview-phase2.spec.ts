import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Phase 2: Core Photography Workflows (Albums & Orders)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and login
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="username-input"]', { state: "visible", timeout: 45000 });
    
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clickflash.local';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'ClickFlash2025!';
    
    await page.fill('[data-testid="username-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for the dashboard to load (checking for Dashboard text)
    await page.waitForSelector('button:has-text("Dashboard")', { state: "visible", timeout: 45000 });
    await page.waitForTimeout(1000); // Wait for UI to stabilize
  });

  test('Albums and Orders workflows', async ({ page }) => {
    test.setTimeout(120000); // Increase timeout
    // --- 1. Albums View ---
    await test.step('Albums View and Interactions', async () => {
      // Click Albums in sidebar
      await page.click('button:has-text("Albums")');
      
      // Wait for Albums page to load
      await page.waitForSelector('text=Import New');
      await page.waitForTimeout(1000); // let UI update
      await page.screenshot({ path: 'tests/e2e/screenshots/09_Albums_Main.png', fullPage: true });

      // Open Import Album Modal
      await page.click('text=Import New');
      // Wait for the modal animation
      await page.waitForTimeout(1000); 
      await page.screenshot({ path: 'tests/e2e/screenshots/10_Albums_Import_Modal.png' });
      
      // Close modal (Press Escape)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000); // wait for modal to close

      // Test Search input
      const searchInput = page.locator('input[placeholder="Search albums..."]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('Test Album');
        await page.waitForTimeout(1000); // let UI update and filter
        await page.screenshot({ path: 'tests/e2e/screenshots/11_Albums_Search.png', fullPage: true });
        await searchInput.fill('');
      }
    });

    // --- 2. Orders View ---
    await test.step('Orders View and Interactions', async () => {
      // Navigate to Orders
      await page.click('button:has-text("Orders")');
      
      // Wait for Orders page to load
      await page.waitForSelector('table', { timeout: 10000 });
      await page.waitForTimeout(1000); // Wait for rows
      await page.screenshot({ path: 'tests/e2e/screenshots/12_Orders_Main.png', fullPage: true });

      // Click on the first order row
      const firstRow = page.locator('tbody tr').first();
      // Only try clicking if a row exists
      if (await firstRow.count() > 0) {
        await firstRow.click();
        
        // Wait for Order Details modal/view
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'tests/e2e/screenshots/13_Order_Details.png', fullPage: true });
        
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      } else {
        console.log('No order rows found to click.');
      }
    });
    
    // --- 3. Print Queue View ---
    await test.step('Print Queue View', async () => {
      await page.click('button:has-text("Print Queue")');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'tests/e2e/screenshots/14_Print_Queue_Main.png', fullPage: true });
    });
  });
});
