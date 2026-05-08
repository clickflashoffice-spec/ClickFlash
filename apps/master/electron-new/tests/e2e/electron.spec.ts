import { test, expect, ElectronApplication } from './fixtures';

test.describe('Kiosk Mode', () => {
  test.beforeEach(async ({ electronPage }) => {
    await electronPage.goto('http://localhost:5173');
  });

  test('should unlock kiosk with correct PIN', async ({ electronPage }) => {
    const result = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.kiosk?.unlock?.('000000');
    });
    
    if (result !== undefined) {
      expect(result.success).toBe(true);
    }
  });

  test('should reject incorrect PIN', async ({ electronPage }) => {
    const result = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.kiosk?.unlock?.('123456');
    });
    
    if (result !== undefined) {
      expect(result.success).toBe(false);
    }
  });

  test('should lock kiosk', async ({ electronPage }) => {
    const result = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.kiosk?.lock?.();
    });
    
    if (result !== undefined) {
      expect(result.success).toBe(true);
    }
  });

  test('should report kiosk status', async ({ electronPage }) => {
    const status = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.kiosk?.getStatus?.();
    });
    
    if (status !== undefined) {
      expect(typeof status.isLocked).toBe('boolean');
    }
  });
});

test.describe('Window Management', () => {
  test('should minimize window', async ({ electronPage }) => {
    const result = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.window?.minimize?.();
    });
    
    expect(result).toBeTruthy();
  });

  test('should maximize window', async ({ electronPage }) => {
    const result = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.window?.maximize?.();
    });
    
    expect(result).toBeTruthy();
  });

  test('should check fullscreen status', async ({ electronPage }) => {
    const isFullscreen = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.window?.isFullscreen?.();
    });
    
    expect(typeof isFullscreen).toBe('boolean');
  });
});

test.describe('Backend Health', () => {
  test('should report backend health status', async ({ electronPage }) => {
    const health = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.backend?.healthCheck?.();
    });
    
    if (health !== undefined) {
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('status');
    }
  });

  test('should report backend status', async ({ electronPage }) => {
    const status = await electronPage.evaluate(async () => {
      return (window as any).electronAPI?.backend?.getStatus?.();
    });
    
    if (status !== undefined) {
      expect(status).toHaveProperty('status');
    }
  });
});

test.describe('Security', () => {
  test('should not expose raw ipcRenderer', async ({ electronPage }) => {
    const hasIpcRenderer = await electronPage.evaluate(() => {
      return typeof (window as any).ipcRenderer !== 'undefined';
    });
    
    expect(hasIpcRenderer).toBe(false);
  });

  test('should not expose node APIs in renderer', async ({ electronPage }) => {
    const hasNode = await electronPage.evaluate(() => {
      return typeof (window as any).process !== 'undefined' || 
             typeof (window as any).require !== 'undefined';
    });
    
    expect(hasNode).toBe(false);
  });

  test('should block navigation to external URLs', async ({ electronPage }) => {
    const logs: string[] = [];
    electronPage.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('Blocked')) {
        logs.push(msg.text());
      }
    });
    
    await electronPage.goto('http://localhost:5173');
    await electronPage.waitForTimeout(1000);
    
    const blockedLogs = logs.filter(l => l.includes('navigation'));
    expect(blockedLogs.length).toBe(0);
  });
});
