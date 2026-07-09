import { describe, it, expect } from 'vitest';
import { generateLicenseKeys, validateLicenseKey } from '../license-key';

describe('License Key Generator & Validator', () => {
  it('should generate requested number of valid license keys', async () => {
    const keys = await generateLicenseKeys({
      plan: 'pro',
      maxMasters: 5,
      expiresDays: 30,
      count: 3
    });

    expect(keys).toHaveLength(3);
    expect(keys[0].key).toMatch(/^CF-LIVE-[a-zA-Z0-9\-_]+.[a-zA-Z0-9\-_]+$/);
    expect(keys[0].plan).toBe('pro');
    expect(keys[0].maxMasters).toBe(5);
  });

  it('should validate a generated key correctly', async () => {
    const keys = await generateLicenseKeys({
      plan: 'enterprise',
      maxMasters: 10,
      expiresDays: 365,
      count: 1,
      machineId: 'hw-machine-id-123'
    });

    const keyData = keys[0];
    const validation = await validateLicenseKey(keyData.key);

    expect(validation.valid).toBe(true);
    expect(validation.plan).toBe('enterprise');
    expect(validation.maxMasters).toBe(10);
    expect(validation.machineId).toBe('hw-machine-id-123');
  });

  it('should reject a key with an invalid prefix', async () => {
    const validation = await validateLicenseKey('INVALID-PREFIX-payload.signature');
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Invalid key prefix');
  });

  it('should reject a key that has been tampered with', async () => {
    const keys = await generateLicenseKeys({
      plan: 'starter',
      maxMasters: 1,
      expiresDays: 7,
      count: 1
    });

    // Tamper with the payload (change the first character of the base64 payload)
    const tamperedKey = keys[0].key.replace(/CF-LIVE-./, 'CF-LIVE-A');
    
    const validation = await validateLicenseKey(tamperedKey);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Invalid signature - key tampered with');
  });

  it('should reject malformed keys gracefully', async () => {
    const validation = await validateLicenseKey('CF-LIVE-justPayloadWithoutSignature');
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('Invalid key format');
  });
});
