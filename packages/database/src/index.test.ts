import { describe, it, expect, vi } from 'vitest';

const pragmaMock = vi.fn();
vi.mock('better-sqlite3-multiple-ciphers', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any) {
      this.pragma = pragmaMock;
      this.open = true;
      this.close = vi.fn();
      return this;
    }),
  };
});

import { createDrizzleClient } from './client';

describe('database package', () => {
  it('should have a basic test', () => {
    expect(true).toBe(true);
  });

  describe('createDrizzleClient encryption key sanitization', () => {
    it('throws error when encryptionKey contains SQL injection characters', () => {
      expect(() => {
        createDrizzleClient({
          path: ':memory:',
          encryptionKey: "secret'; DROP TABLE users; --",
        });
      }).toThrow(/Invalid encryption key/);
    });

    it('throws error when encryptionKey is not valid hex', () => {
      expect(() => {
        createDrizzleClient({
          path: ':memory:',
          encryptionKey: 'not-a-valid-hex-key!',
        });
      }).toThrow(/Invalid encryption key/);
    });

    it('accepts valid hex encryptionKey and applies it as the first pragma', () => {
      pragmaMock.mockClear();
      const { sqlite } = createDrizzleClient({
        path: ':memory:',
        encryptionKey: '0123456789abcdefABCDEF0123456789',
      });
      expect(sqlite).toBeDefined();
      expect(pragmaMock).toHaveBeenCalledWith("key = '0123456789abcdefABCDEF0123456789'");
      // Critical SQLCipher requirement: PRAGMA key must be call 0 (first command before WAL or other pragmas)
      expect(pragmaMock.mock.calls[0][0]).toBe("key = '0123456789abcdefABCDEF0123456789'");
    });
  });
});
