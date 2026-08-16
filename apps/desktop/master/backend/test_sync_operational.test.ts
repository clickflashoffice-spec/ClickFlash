import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testSyncOperational } from './test_sync_operational';
import fetch from 'node-fetch';

vi.mock('node-fetch');
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

describe('testSyncOperational', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return true when both endpoints return ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200
    } as any);

    const result = await testSyncOperational('http://test', 'test-token');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should return false when one endpoint fails', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, status: 200 } as any)
      .mockResolvedValueOnce({ ok: false, status: 401 } as any);

    const result = await testSyncOperational('http://test', 'test-token');
    expect(result).toBe(false);
  });
  
  it('should return false on fetch error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    
    const result = await testSyncOperational('http://test', 'test-token');
    expect(result).toBe(false);
  });
});
