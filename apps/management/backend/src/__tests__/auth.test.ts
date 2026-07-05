import { hashPassword, verifyPassword } from '../auth.js';

async function sha256Hex(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('Auth Module', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testDEFAULT_PASSWORD_PLACEHOLDER';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should produce different hashes for the same password', async () => {
      const password = 'testDEFAULT_PASSWORD_PLACEHOLDER';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    }, 15000);

    it('should reject empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct bcrypt password', async () => {
      const password = 'testDEFAULT_PASSWORD_PLACEHOLDER';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    }, 15000);

    it('should reject an incorrect bcrypt password', async () => {
      const password = 'testDEFAULT_PASSWORD_PLACEHOLDER';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    }, 15000);

    it('should verify a correct legacy SHA-256 password', async () => {
      const password = 'legacyPassword123';
      const hash = await sha256Hex(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect legacy SHA-256 password', async () => {
      const password = 'legacyPassword123';
      const hash = await sha256Hex(password);

      const isValid = await verifyPassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });

    it('should reject non-bcrypt, non-SHA256 hashes', async () => {
      const isValid = await verifyPassword('password', 'notavalidhash');
      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      await expect(verifyPassword('', '$2a$10$hashedpassword')).rejects.toThrow(
        'Password must be a non-empty string'
      );
    });

    it('should reject empty hash', async () => {
      await expect(verifyPassword('password', '')).rejects.toThrow('Hash must be a non-empty string');
    });
  });
});
