import {
  generateKeyPairSync,
  sign,
} from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  validateLicenseKey,
  verifyEd25519License,
} from '../scripts/license-key';

function createSignedLicense(overrides: Record<string, unknown> = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const spki = publicKey.export({ format: 'der', type: 'spki' });
  const publicKeyB64 = spki.subarray(-32).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    plan: 'pro',
    maxMasters: 2,
    expiresAt: null,
    createdAt: '2026-07-16T00:00:00.000Z',
    ...overrides,
  }));
  const signature = sign(null, payload, privateKey);

  return {
    key: `CF-TEST-${payload.toString('base64url')}.${signature.toString('base64url')}`,
    publicKeyB64,
  };
}

describe('Installer license verification', () => {
  it('accepts a valid Ed25519-signed license', () => {
    const fixture = createSignedLicense({ machineId: 'machine-1' });
    const result = verifyEd25519License(
      fixture.key,
      fixture.publicKeyB64,
      'machine-1',
    );

    expect(result.valid).toBe(true);
    expect(result.data?.plan).toBe('pro');
  });

  it('rejects a tampered signature', () => {
    const fixture = createSignedLicense();
    const [payload, encodedSignature] = fixture.key.substring(8).split('.');
    const signature = Buffer.from(encodedSignature, 'base64url');
    signature[0] ^= 1;
    const result = verifyEd25519License(
      `CF-TEST-${payload}.${signature.toString('base64url')}`,
      fixture.publicKeyB64,
    );

    expect(result).toMatchObject({ valid: false });
  });

  it('rejects a license for another machine', () => {
    const fixture = createSignedLicense({ machineId: 'machine-1' });
    const result = verifyEd25519License(
      fixture.key,
      fixture.publicKeyB64,
      'machine-2',
    );

    expect(result.error).toContain('Machine ID mismatch');
  });

  it('rejects expired and malformed payloads', () => {
    const expired = createSignedLicense({ expiresAt: '2020-01-01' });
    const malformed = createSignedLicense({ maxMasters: 0 });

    expect(verifyEd25519License(expired.key, expired.publicKeyB64).error)
      .toContain('expired');
    expect(verifyEd25519License(malformed.key, malformed.publicKeyB64).error)
      .toContain('Malformed');
  });

  it('rejects an invalid production key format', async () => {
    await expect(validateLicenseKey('not-a-license')).resolves.toEqual({
      valid: false,
      error: 'Invalid license prefix',
    });
  });
});
