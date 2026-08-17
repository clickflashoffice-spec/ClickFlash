import { describe, it, expect } from 'vitest';
import { ZeroTrustEnclaveManager } from '../src/zeroTrustEnclave';

describe('ZeroTrustEnclaveManager', () => {
  const keys = ZeroTrustEnclaveManager.generateKeyPair();
  const hardwareFingerprint = 'sha256:d8b248a31e84c98f98a2304918e9a2';

  it('creates and verifies a valid ED25519 hardware enclave attestation', () => {
    const attestation = ZeroTrustEnclaveManager.createAttestation(
      'node_master_alpha',
      hardwareFingerprint,
      ['EDGE_INGESTION', 'VECTOR_SEARCH', 'TRANSCODE_GRID'],
      24,
      keys
    );

    expect(attestation.nodeId).toBe('node_master_alpha');
    expect(attestation.signatureEd25519).toBeDefined();

    const verification = ZeroTrustEnclaveManager.verifyAttestation(attestation, hardwareFingerprint);
    expect(verification.valid).toBe(true);
    expect(verification.error).toBeUndefined();
  });

  it('rejects attestation if hardware fingerprint does not match', () => {
    const attestation = ZeroTrustEnclaveManager.createAttestation(
      'node_touch_beta',
      hardwareFingerprint,
      ['VECTOR_SEARCH', 'PAYMENT_CAPTURE'],
      12,
      keys
    );

    const verification = ZeroTrustEnclaveManager.verifyAttestation(attestation, 'sha256:different_untrusted_chip');
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('Hardware fingerprint mismatch');
  });

  it('rejects expired attestation leases', () => {
    const attestation = ZeroTrustEnclaveManager.createAttestation(
      'node_master_gamma',
      hardwareFingerprint,
      ['EDGE_INGESTION'],
      -1, // expired 1 hour ago
      keys
    );

    const verification = ZeroTrustEnclaveManager.verifyAttestation(attestation);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('lease expired');
  });
});
