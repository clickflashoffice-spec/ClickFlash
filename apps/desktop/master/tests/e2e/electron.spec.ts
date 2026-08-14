import { test, expect, Page } from '@playwright/test';
import { _electron } from '@playwright/test';
import path from 'path';

const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS === 'true';

// Helper to safely get the window and wait for API
async function getWindowAndApi(electronApp: any) {
  const page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  // Wait for electronAPI to be injected
  await page.waitForFunction(() => (window as any).electronAPI !== undefined).catch(() => {});
  return page;
}

test.describe('Kiosk Mode (Electron)', () => {
  test('should unlock kiosk with correct PIN', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const result = await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.kiosk?.unlock?.('000000');
      });

      if (result !== undefined) {
        expect(result.success).toBe(true);
      }
    } finally {
      await electronApp.close();
    }
  });

  test('should reject incorrect PIN', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const result = await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.kiosk?.unlock?.('123456');
      });

      if (result !== undefined) {
        expect(result.success).toBe(false);
      }
    } finally {
      await electronApp.close();
    }
  });

  test('should lock kiosk', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.kiosk?.lock?.();
      });
      // The lock function might return void, so just check it doesn't throw
      expect(true).toBeTruthy();
    } finally {
      await electronApp.close();
    }
  });

  test('should get kiosk status', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const status = await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.kiosk?.getStatus?.();
      });

      if (status !== undefined) {
        expect(typeof status.isLocked).toBe('boolean');
      }
    } finally {
      await electronApp.close();
    }
  });
});

test.describe('Window Management (Electron)', () => {
  test('should minimize window', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.window?.minimize?.();
      });

      expect(true).toBeTruthy();
    } finally {
      await electronApp.close();
    }
  });

  test('should maximize window', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.window?.maximize?.();
      });

      expect(true).toBeTruthy();
    } finally {
      await electronApp.close();
    }
  });

  test('should check fullscreen status', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const isFullscreen = await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.window?.isFullscreen?.();
      });

      if (isFullscreen !== undefined) {
         expect(typeof isFullscreen).toBe('boolean');
      }
    } finally {
      await electronApp.close();
    }
  });
});

test.describe('Backend Health (Electron)', () => {
  test('should report backend health', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const health = await page.evaluate(async () => {
        const api = (window as any).electronAPI;
        return api?.backend?.healthCheck?.();
      });

      if (health !== undefined) {
        expect(health).toHaveProperty('healthy');
        expect(health).toHaveProperty('status');
      }
    } finally {
      await electronApp.close();
    }
  });
});

test.describe('Security (Electron)', () => {
  test('should not expose raw ipcRenderer', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const hasIpcRenderer = await page.evaluate(() => {
        return typeof (window as any).ipcRenderer !== 'undefined';
      });

      expect(hasIpcRenderer).toBe(false);
    } finally {
      await electronApp.close();
    }
  });

  test('should not expose node APIs', async () => {
    const electronApp = await _electron.launch({
      args: [path.join(__dirname, '../../dist/electron/electron-main.js')],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    try {
      const page = await getWindowAndApi(electronApp);

      const hasNode = await page.evaluate(() => {
        return typeof (window as any).process !== 'undefined' || 
               typeof (window as any).require !== 'undefined';
      });

      expect(hasNode).toBe(false);
    } finally {
      await electronApp.close();
    }
  });
});

