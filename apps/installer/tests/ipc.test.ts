import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PAYLOAD_MANIFEST_FILENAME,
  PAYLOAD_SIGNATURE_DOMAIN,
} from '../installer-payload-verification';

// Mock electron's ipcMain
const handlers: Record<string, Function> = {};
const mainFrame = { url: 'http://localhost:5175' };
const webContents = {
  on: vi.fn(),
  setWindowOpenHandler: vi.fn(),
  mainFrame,
  session: {
    setPermissionRequestHandler: vi.fn()
  }
};
const trustedEvent = { sender: webContents, senderFrame: mainFrame };
let selectedDirectory: string | null = null;
const createdDirectories: string[] = [];

function hashFile(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function signPayloadBundle(root: string): void {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const publicDer = publicKey.export({ format: 'der', type: 'spki' });
  process.env.CLICKFLASH_PAYLOAD_KEY_ID = 'payload_ipc_test';
  process.env.CLICKFLASH_PAYLOAD_PUBLIC_KEY = publicDer
    .subarray(publicDer.length - 32)
    .toString('base64');

  const masterPath = path.join(root, 'Master', 'ClickFlash Master OS.exe');
  const touchPath = path.join(root, 'Touch', 'ClickFlash - Touch Kiosk.exe');
  const manifestBytes = Buffer.from(JSON.stringify({
    schema_version: 1,
    release_id: 'release_ipc_test',
    version: '5.0.0',
    platform: 'win32',
    arch: 'x64',
    created_at: '2026-07-17T00:00:00.000Z',
    min_installer_version: '5.0.0',
    components: [
      {
        id: 'master',
        source_directory: 'Master',
        executable: 'ClickFlash Master OS.exe',
        files: [{
          path: 'ClickFlash Master OS.exe',
          size: fs.statSync(masterPath).size,
          sha256: hashFile(masterPath),
        }],
      },
      {
        id: 'touch',
        source_directory: 'Touch',
        executable: 'ClickFlash - Touch Kiosk.exe',
        files: [{
          path: 'ClickFlash - Touch Kiosk.exe',
          size: fs.statSync(touchPath).size,
          sha256: hashFile(touchPath),
        }],
      },
    ],
  }), 'utf8');
  const signature = crypto.sign(null, Buffer.concat([
    Buffer.from(PAYLOAD_SIGNATURE_DOMAIN, 'utf8'),
    Buffer.from([0]),
    manifestBytes,
  ]), privateKey);
  fs.writeFileSync(path.join(root, PAYLOAD_MANIFEST_FILENAME), JSON.stringify({
    schema_version: 1,
    algorithm: 'Ed25519',
    key_id: 'payload_ipc_test',
    manifest: manifestBytes.toString('base64url'),
    signature: signature.toString('base64url'),
  }));
}

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
    show = vi.fn();
    focus = vi.fn();
    isDestroyed = vi.fn().mockReturnValue(false);
    webContents = webContents;
  },
  shell: {
    openExternal: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn(async () => selectedDirectory
      ? { canceled: false, filePaths: [selectedDirectory] }
      : { canceled: true, filePaths: [] })
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn((value: string) => Buffer.from(`protected:${value}`, 'utf8'))
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
  isValidLicensePublicKey: vi.fn().mockReturnValue(true),
  validateLicenseKey: vi.fn().mockImplementation((key, machineId) => {
    if (key === 'VALID_KEY') {
      return { 
        valid: true, 
        data: { plan: 'pro', maxMasters: 1, expiresAt: '2099-12-31T23:59:59.999Z' }
      };
    }
    return { valid: false, error: 'Invalid signature' };
  })
}));

describe('Installer IPC Handlers', () => {
  beforeEach(async () => {
    selectedDirectory = null;
    delete process.env.CLICKFLASH_PAYLOAD_KEY_ID;
    delete process.env.CLICKFLASH_PAYLOAD_PUBLIC_KEY;
    process.env.CLICKFLASH_LICENSE_PUBLIC_KEY = Buffer.alloc(32, 7).toString('base64');
    // Clear handlers before each test
    for (const key in handlers) delete handlers[key];
    
    // Dynamically import electron-main to register handlers
    vi.resetModules();
    await import('../electron-main');
    
    // Wait a tick for app.whenReady().then() to resolve and register handlers
    await new Promise(resolve => setTimeout(resolve, 10));
  }, 30000);

  afterEach(() => {
    delete process.env.CLICKFLASH_PAYLOAD_KEY_ID;
    delete process.env.CLICKFLASH_PAYLOAD_PUBLIC_KEY;
    delete process.env.CLICKFLASH_LICENSE_PUBLIC_KEY;
    for (const directory of createdDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should validate a correct offline license via installer:validateLicense', async () => {
    const validateHandler = handlers['installer:validateLicense'];
    expect(validateHandler).toBeDefined();

    const result = await validateHandler(trustedEvent as any, 'VALID_KEY');
    expect(result.success).toBe(true);
    expect(result.data.plan).toBe('pro');
    expect(result.data.machine_id).toBe('mock-machine-id');
  });

  it('should reject an invalid offline license', async () => {
    const validateHandler = handlers['installer:validateLicense'];
    expect(validateHandler).toBeDefined();

    const result = await validateHandler(trustedEvent as any, 'INVALID_KEY');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid signature');
  });

  it('should handle hardware fingerprint generation via installer:getHardwareFingerprint', async () => {
    const fingerprintHandler = handlers['installer:getHardwareFingerprint'];
    expect(fingerprintHandler).toBeDefined();

    const result = await fingerprintHandler(trustedEvent as any);
    expect(result.fingerprint).toBeDefined();
    expect(typeof result.fingerprint).toBe('string');
  });

  it('fails closed for malformed configuration and disabled geolocation contracts', async () => {
    const configResult = await handlers['installer:writeEnvConfig'](trustedEvent as any, {});
    const geolocationResult = await handlers['installer:getGeolocation'](trustedEvent as any);
    expect(configResult.success).toBe(false);
    expect(geolocationResult.success).toBe(false);
  });

  it('rejects malformed save and launch payloads', async () => {
    const saveResult = await handlers['installer:saveConfig'](trustedEvent as any, {
      deskId: 'MASTER_TEST_01',
      unexpected: true,
    });
    expect(saveResult).toEqual({ success: false, error: 'Invalid installer configuration' });

    const installResult = await handlers['installer:installPayload'](trustedEvent as any, {
      components: ['master'],
      unexpected: true,
    });
    expect(installResult).toEqual({
      success: false,
      error: 'Invalid application installation request',
    });

    const launchResult = await handlers['installer:launchApps'](trustedEvent as any, {
      components: ['master'],
      unexpected: true,
    });
    expect(launchResult).toEqual({ master: false, touch: false });
  });

  it('commits allowlisted application configuration only after directory approval', async () => {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), 'clickflash-ipc-source-'));
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'clickflash-ipc-target-'));
    createdDirectories.push(source, target);
    fs.mkdirSync(path.join(source, 'Master'));
    fs.mkdirSync(path.join(source, 'Touch'));
    fs.writeFileSync(path.join(source, 'Master', 'ClickFlash Master OS.exe'), 'master');
    fs.writeFileSync(path.join(source, 'Touch', 'ClickFlash - Touch Kiosk.exe'), 'touch');
    signPayloadBundle(source);
    selectedDirectory = source;

    const approved = await handlers['installer:selectPayloadBundle'](trustedEvent as any);
    expect(approved).toMatchObject({
      success: true,
      directory: fs.realpathSync(source),
      summary: { releaseId: 'release_ipc_test', components: ['master', 'touch'] },
    });

    selectedDirectory = target;
    const approvedTarget = await handlers['installer:selectInstallDirectory'](trustedEvent as any);
    expect(approvedTarget).toBe(fs.realpathSync(target));

    const installed = await handlers['installer:installPayload'](trustedEvent as any, {
      components: ['master', 'touch'],
    });
    expect(installed).toMatchObject({
      success: true,
      mode: 'install',
      summary: { releaseId: 'release_ipc_test', components: ['master', 'touch'] },
    });

    const result = await handlers['installer:writeEnvConfig'](trustedEvent as any, {
      targetDir: target,
      selectedApps: ['master', 'touch'],
      deskId: 'MASTER_TUNIS_01',
      siteCode: 'TUNIS_01',
      tenantId: 'tenant-1',
      timezone: 'Africa/Tunis',
      location: 'Tunis',
      currency: 'TND',
    });

    expect(result).toEqual({ success: true });
    expect(fs.existsSync(path.join(target, 'Master', 'ClickFlash Master OS.exe'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'Touch', 'ClickFlash - Touch Kiosk.exe'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'Master', '.env'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'Touch', '.env'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'clickflash-installation.json'))).toBe(true);
  });

  it('rejects unapproved cloud and public-LAN network targets', async () => {
    const fleetResult = await handlers['installer:registerFleet'](trustedEvent as any, {
      deskId: 'MASTER_TEST_01',
      name: 'Test Studio',
      location: 'Tunis',
      country: 'TN',
      timezone: 'Africa/Tunis',
      currency: 'TND',
      cloudApiUrl: 'https://attacker.test',
      token: 'test-token',
    });
    expect(fleetResult).toEqual({ success: false, error: 'Invalid fleet registration payload' });

    const pairingResult = await handlers['installer:exchangePairing'](trustedEvent as any, {
      masterHost: '8.8.8.8',
      masterPort: 8090,
      masterDeskId: 'MASTER_TEST_01',
      kioskId: 'KIOSK_TEST_01',
      hardwareFingerprint: 'fingerprint',
    });
    expect(pairingResult).toEqual({ success: false, error: 'Invalid private-LAN pairing payload' });
  });

  it('rejects malformed network payloads before making requests', async () => {
    const pollResult = await handlers['installer:pollForToken'](
      trustedEvent as any,
      'bad\r\ndevice-code',
    );
    expect(pollResult).toEqual({ success: false, error: 'Invalid device code' });

    const registrationResult = await handlers['installer:registerWithHub'](
      trustedEvent as any,
      {
        desk_id: 'MASTER_TEST_01',
        name: 'Test Studio',
        location: 'Tunis',
        country: 'TN',
        timezone: 'Africa/Tunis',
        currency: 'TND',
        hardware_fingerprint: 'a'.repeat(32),
        version: '5.0.0',
        mode: 'install',
        access_token: 'token',
        unexpected: true,
      },
    );
    expect(registrationResult).toEqual({
      success: false,
      error: 'Invalid Hub registration payload',
    });

    await expect(handlers['installer:runHealthChecks'](trustedEvent as any, {
      masterPort: 8090,
      touchPort: 8091,
      cloudApiUrl: 'https://attacker.test',
      deskId: 'MASTER_TEST_01',
      token: 'token',
    })).rejects.toThrow('Invalid health-check configuration');
  });

  it('rejects privileged IPC from an untrusted frame', async () => {
    const validateHandler = handlers['installer:validateLicense'];
    expect(() => validateHandler(
      { sender: webContents, senderFrame: { url: 'https://attacker.test' } },
      'VALID_KEY',
    )).toThrow('Unauthorized IPC sender');
  });
});
