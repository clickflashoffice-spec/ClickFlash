import { createToken, verifyToken, extractTokenFromHeader } from './jwt.js';

const TEST_SECRET = 'test-secret-key-for-jwt-signing';

describe('JWT Module', () => {
  describe('createToken', () => {
    it('should create a signed JWT with the default 24h expiration', async () => {
      const token = await createToken({ userId: 'user-123', email: 'test@clickflash.ai' }, TEST_SECRET);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include payload claims', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@clickflash.ai',
        role: 'customer',
        destinationId: 'hotel-1',
      };
      const token = await createToken(payload, TEST_SECRET);
      const decoded = await verifyToken(token, TEST_SECRET);

      expect(decoded).toMatchObject(payload);
    });

    it('should support custom expiration', async () => {
      const token = await createToken({ userId: 'user-123' }, TEST_SECRET, '1h');
      const decoded = await verifyToken(token, TEST_SECRET);

      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe('user-123');
    });
  });

  describe('verifyToken', () => {
    it('should return payload for a valid token', async () => {
      const payload = { userId: 'user-123', email: 'test@clickflash.ai', role: 'admin' };
      const token = await createToken(payload, TEST_SECRET);

      const decoded = await verifyToken(token, TEST_SECRET);
      expect(decoded).toMatchObject(payload);
    });

    it('should return null for an invalid signature', async () => {
      const token = await createToken({ userId: 'user-123' }, TEST_SECRET);
      const decoded = await verifyToken(token, 'wrong-secret');

      expect(decoded).toBeNull();
    });

    it('should return null for a malformed token', async () => {
      const decoded = await verifyToken('not-a-token', TEST_SECRET);
      expect(decoded).toBeNull();
    });

    it('should return null for an expired token', async () => {
      const expiredToken = await createToken({ userId: 'user-123' }, TEST_SECRET, -1);
      const decoded = await verifyToken(expiredToken, TEST_SECRET);

      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = extractTokenFromHeader('Bearer valid-token');
      expect(token).toBe('valid-token');
    });

    it('should return null for missing header', () => {
      const token = extractTokenFromHeader(null);
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const token = extractTokenFromHeader('Basic abc123');
      expect(token).toBeNull();
    });
  });
});
