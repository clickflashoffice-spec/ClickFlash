import { describe, it, expect } from 'vitest';
import { generateEd25519KeyPair } from '@clickflash/licensing';
import { generateLicenseKeys, validateLicenseKey } from '../license-key';

const testKeys = generateEd25519KeyPair();

function generateTestLicenseKeys(options: Parameters<typeof generateLicenseKeys>[0]) {
  return generateLicenseKeys(options, testKeys.privateKey);
}

describe('License Key Generator & Validator', () => {
  it('requires an operator-provided private signing key', async () => {
    await expect(generateLicenseKeys({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 30,
      count: 1,
      machineId: 'machine-001',
    }, 'not-a-private-key')).rejects.toThrow('Enter a valid Ed25519 private signing key');
  });

  it('should generate requested number of valid license keys', async () => {
    const keys = await generateTestLicenseKeys({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 30,
      count: 3,
      machineId: 'machine-001',
    });

    expect(keys).toHaveLength(3);
    expect(keys[0].key).toMatch(/^CF-LIVE-[a-zA-Z0-9\-_]+.[a-zA-Z0-9\-_]+$/);
    expect(keys[0].plan).toBe('pro');
    expect(keys[0].maxMasters).toBe(5);
  });

  it('should validate a generated key correctly', async () => {
    const keys = await generateTestLicenseKeys({
      plan: 'enterprise',
      maxMasters: 10,
      expiresDays: 365,
      count: 1,
      machineId: 'hw-machine-id-123'
    });

    const keyData = keys[0];
    const validation = await validateLicenseKey(keyData.key, testKeys.publicKey);

    expect(validation.valid).toBe(true);
    expect(validation.plan).toBe('enterprise');
    expect(validation.maxMasters).toBe(10);
    expect(validation.machineId).toBe('hw-machine-id-123');
  });

  it('should reject a key with an invalid prefix', async () => {
    const validation = await validateLicenseKey('INVALID-PREFIX-payload.signature', testKeys.publicKey);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Invalid license prefix');
  });

  it('should reject a key that has been tampered with', async () => {
    const keys = await generateTestLicenseKeys({
      plan: 'starter',
      maxMasters: 1,
      expiresDays: 7,
      count: 1,
      machineId: 'machine-001',
    });

    // Tamper with the payload (change the first character of the base64 payload)
    const tamperedKey = keys[0].key.replace(/CF-LIVE-./, 'CF-LIVE-A');
    
    const validation = await validateLicenseKey(tamperedKey, testKeys.publicKey);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Invalid signature - key tampered with');
  });

  it('should reject malformed keys gracefully', async () => {
    const validation = await validateLicenseKey('CF-LIVE-justPayloadWithoutSignature', testKeys.publicKey);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Invalid key format');
  });

  it('should reject a key when machine ID does not match expected machine ID', async () => {
    const keys = await generateTestLicenseKeys({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 30,
      count: 1,
      machineId: 'hw-machine-id-123'
    });

    const validation = await validateLicenseKey(keys[0].key, testKeys.publicKey, { expectedMachineId: 'hw-machine-id-DIFFERENT' });
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Machine ID mismatch - license bound to different hardware');
  });

  it('should reject an expired license key', async () => {
    const keys = await generateTestLicenseKeys({
      plan: 'starter',
      maxMasters: 1,
      expiresDays: -1, // expired yesterday
      count: 1,
      machineId: 'machine-001',
    });

    const validation = await validateLicenseKey(keys[0].key, testKeys.publicKey);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('License key has expired');
  });
});
