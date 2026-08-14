import { vi } from 'vitest';

vi.mock('./installer-authenticode', () => {
  return {
    verifyAuthenticodeSignature: vi.fn().mockResolvedValue(true),
  };
});
