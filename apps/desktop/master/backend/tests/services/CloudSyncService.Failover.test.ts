import { CloudSyncService } from '../../services/cloudSyncService';
import DatabaseManager from '../../database/db';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockEmailService = {
  sendEmail: jest.fn(),
  setCloudConfig: jest.fn(),
};

describe('CloudSyncService - Multi-Region Failover & Resilience', () => {
  let service: CloudSyncService;
  let mockDbManager: any;
  let originalFetch: any;

  beforeEach(() => {
    mockDbManager = {
      get: jest.fn(),
      run: jest.fn(),
      query: jest.fn().mockReturnValue([]),
      exec: jest.fn(),
      all: jest.fn(),
    };

    originalFetch = (globalThis as any).fetch;

    // Set env vars
    process.env.CLOUD_API_URL = 'https://hq.clickflash.com';
    process.env.CLOUD_FAILOVER_URL = 'https://backup.clickflash.com';

    service = new CloudSyncService(
      mockDbManager as unknown as DatabaseManager,
      mockLogger as any,
      mockEmailService as any
    );
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    delete process.env.CLOUD_API_URL;
    delete process.env.CLOUD_FAILOVER_URL;
  });

  it('should use primary URL when it returns a successful response (< 500)', async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url === 'https://hq.clickflash.com/api/test') {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
    (globalThis as any).fetch = mockFetch;

    const res = await service.fetchWithFailover('/api/test');
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('https://hq.clickflash.com/api/test', undefined);
  });

  it('should failover to secondary URL when primary URL returns a 500 error', async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url === 'https://hq.clickflash.com/api/test') {
        return Promise.resolve({
          status: 503,
          statusText: 'Service Unavailable',
        });
      }
      if (url === 'https://backup.clickflash.com/api/test') {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: async () => ({ success: true, failover: true }),
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
    (globalThis as any).fetch = mockFetch;

    const res = await service.fetchWithFailover('/api/test');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.failover).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://hq.clickflash.com/api/test', undefined);
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://backup.clickflash.com/api/test', undefined);
  });

  it('should failover when primary URL throws a network/DNS error', async () => {
    const mockFetch = jest.fn().mockImplementation((url: string) => {
      if (url === 'https://hq.clickflash.com/api/test') {
        return Promise.reject(new Error('getaddrinfo ENOTFOUND hq.clickflash.com'));
      }
      if (url === 'https://backup.clickflash.com/api/test') {
        return Promise.resolve({
          status: 200,
          ok: true,
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
    (globalThis as any).fetch = mockFetch;

    const res = await service.fetchWithFailover('/api/test');
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw an error when both primary and secondary fail so executeWithRetry can back off', async () => {
    const mockFetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        status: 502,
        statusText: 'Bad Gateway',
      });
    });
    (globalThis as any).fetch = mockFetch;

    await expect(service.fetchWithFailover('/api/test')).rejects.toThrow('Failover hub returned status 502: Bad Gateway');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
