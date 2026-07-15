import { describe, it, expect } from 'vitest';
import { generateKeyPair, signLicense, verifyLicense } from '../src/crypto';
import { generateEd25519License, verifyEd25519License } from '../src/ed25519';

describe('Licensing Engine Cryptography', () => {
  describe('RSA-4096 (crypto.ts)', () => {
    it('should generate, sign, and verify an RSA license', () => {
      const keys = generateKeyPair();
      const payload = {
        machineFingerprint: 'TEST-MACHINE-123',
        issuedAt: Date.now(),
        features: ['basic', 'pro']
      };

      const signed = signLicense(payload, keys.privateKey);
      
      expect(signed.payload).toEqual(payload);
      expect(signed.signature).toBeTypeOf('string');

      const isVerified = verifyLicense(signed, keys.publicKey, 'TEST-MACHINE-123');
      expect(isVerified).toBe(true);
    });

    it('should fail verification if machine fingerprint mismatches', () => {
      const keys = generateKeyPair();
      const payload = {
        machineFingerprint: 'TEST-MACHINE-123',
        issuedAt: Date.now(),
        features: ['basic']
      };

      const signed = signLicense(payload, keys.privateKey);
      const isVerified = verifyLicense(signed, keys.publicKey, 'WRONG-MACHINE');
      
      expect(isVerified).toBe(false);
    });
  });

  describe('Ed25519 (ed25519.ts)', () => {
    // Valid tweetnacl keypairs
    const PRIVATE_KEY_B64 = "EQdSP71FUDU55wNFrjIfVQUpYBme6kBsYhD1ecjmvAg9TlyEi1GiO7PcemwH8fQttWH/4Fh4EUzizyC/GYS+pQ==";
    const PUBLIC_KEY_B64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";

    it('should generate and verify an Ed25519 license', () => {
      const license = generateEd25519License({
        plan: 'pro',
        maxMasters: 5,
        expiresDays: 30,
        machineId: 'MACHINE-456'
      }, PRIVATE_KEY_B64);

      expect(license.key).toContain('CF-LIVE-');

      const result = verifyEd25519License(license.key, PUBLIC_KEY_B64, {
        expectedMachineId: 'MACHINE-456'
      });

      expect(result.valid).toBe(true);
      expect(result.data?.plan).toBe('pro');
      expect(result.data?.maxMasters).toBe(5);
    });

    it('should fail verification if machine ID mismatches', () => {
      const license = generateEd25519License({
        plan: 'enterprise',
        maxMasters: 99,
        expiresDays: 365,
        machineId: 'MACHINE-456'
      }, PRIVATE_KEY_B64);

      const result = verifyEd25519License(license.key, PUBLIC_KEY_B64, {
        expectedMachineId: 'WRONG-MACHINE'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Machine ID mismatch');
    });
  });
});
