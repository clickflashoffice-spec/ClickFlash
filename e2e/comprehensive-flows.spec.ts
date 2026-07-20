import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Ecosystem Golden Path Flow', () => {
  test('Master <-> Touch <-> Cloud Sync Cycle', async () => {
    const isProd = process.env.USE_PROD_BINARIES === 'true';

    // Boot Master App
    const masterApp = await electron.launch({
      executablePath: isProd ? path.join(__dirname, '../apps/master/release/win-unpacked/ClickFlashMaster.exe') : undefined,
      args: isProd ? [] : [path.join(__dirname, '../apps/master/dist/main.js')]
    });
    
    // Boot Touch App
    const touchApp = await electron.launch({
      executablePath: isProd ? path.join(__dirname, '../apps/touch/release/win-unpacked/ClickFlashTouch.exe') : undefined,
      args: isProd ? [] : [path.join(__dirname, '../apps/touch/dist/main.js')]
    });

    const masterWindow = await masterApp.firstWindow();
    const touchWindow = await touchApp.firstWindow();

    // 1. Master registers station
    await masterWindow.waitForSelector('text=Station Online');

    // 2. Touch pairs with Master
    await touchWindow.fill('input[name="pair-code"]', '1234');
    await touchWindow.click('button:has-text("Pair")');
    await expect(touchWindow.locator('text=Paired to Studio')).toBeVisible();

    // 3. Simulate offline photo sync from Mobile to Master via API (Mocking mobile push)
    const apiContext = masterWindow.request;
    const res = await apiContext.post('http://127.0.0.1:8090/api/shifts/proxy', {
      data: { shift_id: 'test-shift', photographer: 'test', face_vector: [0.1, 0.2] }
    });
    expect(res.ok()).toBeTruthy();

    // 4. Touch detects sync and customer interacts
    await expect(touchWindow.locator('text=New Photos Available')).toBeVisible();

    // 5. Test teardown
    await masterApp.close();
    await touchApp.close();
  });
});
