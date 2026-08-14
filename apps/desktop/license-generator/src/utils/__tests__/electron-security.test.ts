import { describe, expect, it } from 'vitest';
import {
  generateLicenseRequestSchema,
  validateLicenseRequestSchema,
} from '../../electron-contract';
import { isTrustedIpcSender } from '../../electron-security';

describe('License Generator Electron boundary', () => {
  it('accepts IPC only from the live top frame', () => {
    const mainFrame = { url: 'file:///app/index.html' };
    const webContents = { mainFrame };
    const window = { isDestroyed: () => false, webContents };

    expect(isTrustedIpcSender({ sender: webContents, senderFrame: mainFrame }, window)).toBe(true);
    expect(isTrustedIpcSender({ sender: webContents, senderFrame: {} }, window)).toBe(false);
    expect(isTrustedIpcSender({ sender: {}, senderFrame: mainFrame }, window)).toBe(false);
  });

  it('strictly bounds license generation requests', () => {
    expect(generateLicenseRequestSchema.safeParse({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 365,
      count: 10,
      machineId: 'machine-001',
    }).success).toBe(true);
    expect(generateLicenseRequestSchema.safeParse({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 365,
      count: 101,
      machineId: 'machine-001',
    }).success).toBe(false);
    expect(generateLicenseRequestSchema.safeParse({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 365,
      count: 1,
      machineId: 'machine-001',
      signingKey: 'must-not-cross-the-renderer-boundary',
    }).success).toBe(false);
  });

  it('bounds validation input and rejects unknown fields', () => {
    expect(validateLicenseRequestSchema.safeParse({ key: 'CF-LIVE-test.signature' }).success).toBe(true);
    expect(validateLicenseRequestSchema.safeParse({ key: '', privateKey: 'secret' }).success).toBe(false);
  });
});
