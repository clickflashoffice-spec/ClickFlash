import { describe, it, expect, vi } from 'vitest';

const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({
  default: mockFetch,
}));

describe('testSyncOperational', () => {
  it('should return true when both endpoints return ok', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const { testSyncOperational } = await import('./test_sync_operational');
    const result = await testSyncOperational('http://test', 'test-token');
    expect(result).toBe(true);
  });
});

