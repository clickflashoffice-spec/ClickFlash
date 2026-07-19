import { jest } from '@jest/globals';

import worker from '../server.js';

const database: any = {
  prepare: jest.fn(),
  batch: jest.fn(),
};

const createEnv = (overrides: Record<string, unknown> = {}): any => ({
  DB: database,
  GALLERY_BUCKET: {},
  JWT_SECRET: 'test-jwt-secret',
  ALLOWED_ORIGINS: '*',
  DEPLOY_ENV: 'test',
  ...overrides,
});

const executionContext = (): ExecutionContext => ({
  waitUntil: jest.fn(),
  passThroughOnException: jest.fn(),
  props: {},
} as unknown as ExecutionContext);

describe('Management Worker security boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects deceptive production origins before route execution', async () => {
    const request = new Request('https://management.example/api/website/portfolio', {
      headers: { Origin: 'https://evilclickflash.com' },
    });
    const response = await worker.fetch(request, createEnv({
      DEPLOY_ENV: 'production',
      ALLOWED_ORIGINS: 'https://admin.clickflash.com',
    }), executionContext());

    expect(response.status).toBe(403);
    expect(database.prepare).not.toHaveBeenCalled();
  });

  it('echoes an explicitly allowed production origin', async () => {
    const request = new Request('https://management.example/api/website/contact', {
      method: 'OPTIONS',
      headers: { Origin: 'https://admin.clickflash.com' },
    });
    const response = await worker.fetch(request, createEnv({
      DEPLOY_ENV: 'production',
      ALLOWED_ORIGINS: 'https://admin.clickflash.com',
    }), executionContext());

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://admin.clickflash.com');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

});
