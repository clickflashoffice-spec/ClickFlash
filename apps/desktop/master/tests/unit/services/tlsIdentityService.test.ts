import { vi } from 'vitest';
import { getOrCreateManagedIdentity } from '../../../backend/config/tlsIdentityService';
import forge from 'node-forge';
import crypto from 'crypto';

vi.mock('../../../backend/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('tlsIdentityService', () => {
  it('should return a valid managed identity with correct SHA-256 fingerprint', () => {
    const identity = getOrCreateManagedIdentity();
    
    expect(identity).toBeDefined();
    expect(identity.cert).toContain('BEGIN CERTIFICATE');
    expect(identity.key).toContain('PRIVATE KEY');
    expect(identity.fingerprintSha256).toBeDefined();
    expect(identity.fingerprintSha256).toMatch(/^[a-f0-9]{64}$/i);
    
    // Verify the fingerprint matches the certificate manually
    const forgeCert = forge.pki.certificateFromPem(identity.cert);
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(forgeCert)).getBytes();
    const expectedFingerprint = crypto.createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');
    
    expect(identity.fingerprintSha256).toBe(expectedFingerprint);
  });

  it('should return the same identity on subsequent calls (caching)', () => {
    const identity1 = getOrCreateManagedIdentity();
    const identity2 = getOrCreateManagedIdentity();
    
    expect(identity1.cert).toBe(identity2.cert);
    expect(identity1.key).toBe(identity2.key);
    expect(identity1.fingerprintSha256).toBe(identity2.fingerprintSha256);
  });
});
