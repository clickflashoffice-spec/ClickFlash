import { describe, it, expect } from 'vitest';
import { generateEd25519KeyPair, generateEd25519License, verifyEd25519License } from '../src/ed25519';

describe('Licensing Engine Cryptography', () => {
  describe('Ed25519 (ed25519.ts)', () => {
    const testKeys = generateEd25519KeyPair();

    it('should generate and verify an Ed25519 license', () => {
      const license = generateEd25519License({
        plan: 'pro',
        maxMasters: 5,
        expiresDays: 30,
        machineId: 'MACHINE-456'
      }, testKeys.privateKey);

      expect(license.key).toContain('CF-LIVE-');

      const result = verifyEd25519License(license.key, testKeys.publicKey, {
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
      }, testKeys.privateKey);

      const result = verifyEd25519License(license.key, testKeys.publicKey, {
        expectedMachineId: 'WRONG-MACHINE'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Machine ID mismatch');
    });
  });
});
