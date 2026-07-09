import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron's ipcMain
const handlers: Record<string, Function> = {};
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, callback: Function) => {
      handlers[channel] = callback;
    }
  },
  app: {
    isPackaged: false,
    getVersion: () => '5.0.0',
    on: vi.fn(),
    whenReady: vi.fn().mockResolvedValue(undefined),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    quit: vi.fn()
  },
  BrowserWindow: class {
    loadURL = vi.fn();
    loadFile = vi.fn();
    setMenuBarVisibility = vi.fn();
    setAutoHideMenuBar = vi.fn();
    once = vi.fn();
    on = vi.fn();
    webContents = {
      on: vi.fn(),
      setWindowOpenHandler: vi.fn()
    };
  },
  shell: {
    openExternal: vi.fn()
  },
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn()
  }
}));

// Mock systeminformation
vi.mock('systeminformation', () => ({
  default: {
    uuid: vi.fn().mockResolvedValue({
      os: 'mock-machine-id',
      hardware: 'mock-hardware-id'
    })
  },
  uuid: vi.fn().mockResolvedValue({
    os: 'mock-machine-id',
    hardware: 'mock-hardware-id'
  })
}));

// Mock the offline license validator
vi.mock('../scripts/license-key', () => ({
  validateLicenseKey: vi.fn().mockImplementation((key, machineId) => {
    if (key === 'VALID_KEY') {
      return { 
        valid: true, 
        data: { plan: 'PRO', maxMasters: 1, expiresAt: '2099-12-31T23:59:59.999Z' } 
      };
    }
    return { valid: false, error: 'Invalid signature' };
  })
}));

describe('Installer IPC Handlers', () => {
  beforeEach(async () => {
    // Clear handlers before each test
    for (const key in handlers) delete handlers[key];
    
    // Dynamically import electron-main to register handlers
    vi.resetModules();
    await import('../electron-main');
    
    // Wait a tick for app.whenReady().then() to resolve and register handlers
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  it('should validate a correct offline license via installer:validateLicense', async () => {
    const validateHandler = handlers['installer:validateLicense'];
    expect(validateHandler).toBeDefined();

    const result = await validateHandler({} as any, 'VALID_KEY');
    expect(result.success).toBe(true);
    expect(result.data.plan).toBe('PRO');
    expect(result.data.machine_id).toBe('mock-machine-id');
  });

  it('should reject an invalid offline license', async () => {
    const validateHandler = handlers['installer:validateLicense'];
    expect(validateHandler).toBeDefined();

    const result = await validateHandler({} as any, 'INVALID_KEY');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });

  it('should handle hardware fingerprint generation via installer:getHardwareFingerprint', async () => {
    const fingerprintHandler = handlers['installer:getHardwareFingerprint'];
    expect(fingerprintHandler).toBeDefined();

    const result = await fingerprintHandler({} as any);
    expect(result.fingerprint).toBeDefined();
    expect(typeof result.fingerprint).toBe('string');
  });
});

