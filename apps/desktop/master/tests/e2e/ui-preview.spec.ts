import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENS_DIR)) {
  fs.mkdirSync(SCREENS_DIR, { recursive: true });
}

test.describe('Full UI Browser Preview Test', () => {
  // Use a longer timeout for the full UI sweep
  test.setTimeout(120000); 

  test('Log in and navigate through all sidebar views', async ({ page }) => {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

    console.log('Logging in...');
    await page.waitForSelector('[data-testid="username-input"]', { state: "visible", timeout: 45000 });
    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clickflash.local';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'ClickFlash2025!';
    await page.fill('[data-testid="username-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');

    // Wait for Dashboard to appear
    console.log('Waiting for login to complete...');
    // Look for some text indicative of being logged in, we know Dashboard is the default view.
    // Try waiting for the 'Dashboard' text from the sidebar or main content
    await page.waitForSelector('button:has-text("Dashboard")', { state: "visible", timeout: 45000 });
    
    // We should wait a moment for the data to settle
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENS_DIR, '01_Dashboard.png') });
    console.log('Captured 01_Dashboard.png');

    const viewsToTest = [
      'Albums',
      'Orders',
      'Print Queue',
      'Photographers',
      'Growth',
      'Resort BI',
      'Settings'
    ];

    for (let i = 0; i < viewsToTest.length; i++) {
      const viewName = viewsToTest[i];
      console.log(`Navigating to ${viewName}...`);
      
      // Look for the sidebar item. 
      // The Sidebar uses NavItems which are buttons containing the label text.
      const navItem = page.getByRole('button', { name: viewName, exact: true }).or(page.getByText(viewName, { exact: true }));
      await navItem.first().click();
      
      // Wait for content to render. We just wait briefly as it's a client-side transition
      await page.waitForTimeout(2000);
      
      const fileIndex = String(i + 2).padStart(2, '0');
      const filename = `${fileIndex}_${viewName.replace(/\s+/g, '_')}.png`;
      await page.screenshot({ path: path.join(SCREENS_DIR, filename) });
      console.log(`Captured ${filename}`);
    }

    console.log('UI Preview Sweep Complete. All screenshots saved to ' + SCREENS_DIR);
  });
});
