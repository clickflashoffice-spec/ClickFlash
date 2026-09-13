import { describe, it, expect, vi } from 'vitest';
import { DPAPI } from '../../utils/dpapi';
import os from 'os';

describe('DPAPI Utility', () => {
  it('should encrypt and decrypt a string symmetrically on Windows', () => {
    if (os.platform() !== 'win32') {
      console.log('Skipping DPAPI test on non-Windows platform.');
      return;
    }
    
    const plaintext = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const encrypted = DPAPI.protect(plaintext);
    
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(0);
    
    const decrypted = DPAPI.unprotect(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});