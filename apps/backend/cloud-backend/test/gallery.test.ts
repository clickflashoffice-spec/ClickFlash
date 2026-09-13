import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import routerApp, { parseSingleByteRange } from '../src/routes/gallery';
import { AuthConfigurationError, createGalleryToken, getGalleryPrincipal, requireGalleryAuth, requireServiceAuth, verifyGalleryToken } from '../src/auth';

vi.mock('../src/auth', () => ({
  AuthConfigurationError: class extends Error {},
  createGalleryToken: vi.fn(),
  getGalleryPrincipal: vi.fn(),
  requireGalleryAuth: vi.fn(async (c, next) => next()),
  requireServiceAuth: vi.fn(async (c, next) => next()),
  verifyGalleryToken: vi.fn()
}));

const mockDb = {
  prepare: vi.fn(),
};

const mockKv = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
};

const mockBucket = {
  head: vi.fn(),
  get: vi.fn(),
  put: vi.fn()
};

describe('parseSingleByteRange', () => {
  it('parses bounded, open-ended, and suffix byte ranges', () => {
    expect(parseSingleByteRange('bytes=0-99', 1_000)).toEqual({ start: 0, end: 99, length: 100 });
    expect(parseSingleByteRange('bytes=900-', 1_000)).toEqual({ start: 900, end: 999, length: 100 });
    expect(parseSingleByteRange('bytes=-25', 1_000)).toEqual({ start: 975, end: 999, length: 25 });
    expect(parseSingleByteRange('bytes=950-5000', 1_000)).toEqual({ start: 950, end: 999, length: 50 });
  });

  it('rejects malformed, multiple, reversed, and unsatisfiable ranges', () => {
    expect(() => parseSingleByteRange('items=0-10', 1_000)).toThrow();
    expect(() => parseSingleByteRange('bytes=0-1,4-5', 1_000)).toThrow();
    expect(() => parseSingleByteRange('bytes=20-10', 1_000)).toThrow();
    expect(() => parseSingleByteRange('bytes=1000-', 1_000)).toThrow();
    expect(() => parseSingleByteRange('bytes=-0', 1_000)).toThrow();
    expect(() => parseSingleByteRange('bytes=a-b', 1_000)).toThrow();
    expect(() => parseSingleByteRange('bytes=0-99', -1)).toThrow();
  });
});

const app = new Hono<any>();
app.use('*', async (c: any, next: any) => {
  c.set('DB', mockDb);
  c.set('regionId', 'test-region');
  await next();
});
app.route('/', routerApp);

const getEnv = (overrides = {}) => ({
  DB: mockDb,
  SESSION_KV: mockKv,
  PHOTO_BUCKET: mockBucket,
  ...overrides
} as any);

describe('gallery routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /login', () => {
    it('returns 400 if missing accessCode', async () => {
      const res = await app.request('/login', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 if invalid access code', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => null }) });
      const res = await app.request('/login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(401);
    });

    it('returns token on success', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ id: 1, access_code: '123', name: 'Test' }) }) });
      vi.mocked(createGalleryToken).mockResolvedValue('test_token');
      const res = await app.request('/login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.token).toBe('test_token');
      expect(data.event).toEqual({ id: 1, name: 'Test' });
    });

    it('handles AuthConfigurationError', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ id: 1 }) }) });
      vi.mocked(createGalleryToken).mockRejectedValue(new AuthConfigurationError('config error'));
      const res = await app.request('/login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(503);
    });

    it('handles generic error', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ id: 1 }) }) });
      vi.mocked(createGalleryToken).mockRejectedValue(new Error('Generic'));
      const res = await app.request('/login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('POST /qr/generate', () => {
    it('returns 400 if missing eventId or accessCode', async () => {
      const res = await app.request('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 if event not found', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => null }) });
      const res = await app.request('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1', accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(404);
    });

    it('generates QR token with KV', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ id: '1' }) }) });
      const res = await app.request('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1', accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(200);
      expect(mockKv.put).toHaveBeenCalled();
    });

    it('generates QR token with DB fallback', async () => {
      const mockRun = vi.fn();
      mockDb.prepare.mockImplementation((query) => {
        if (query.includes('SELECT')) return { bind: () => ({ first: async () => ({ id: '1' }) }) };
        if (query.includes('INSERT')) return { bind: () => ({ run: mockRun }) };
      });
      const res = await app.request('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1', accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv({ SESSION_KV: undefined }));
      expect(res.status).toBe(200);
      expect(mockRun).toHaveBeenCalled();
    });

    it('handles errors', async () => {
      mockDb.prepare.mockImplementation(() => { throw new Error('DB Error'); });
      const res = await app.request('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1', accessCode: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('POST /qr/validate', () => {
    it('returns 400 if missing token', async () => {
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 if invalid token from KV', async () => {
      mockKv.get.mockResolvedValue(null);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => null }) });
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(401);
    });

    it('returns 401 if token expired', async () => {
      mockKv.get.mockResolvedValue({ eventId: '1', expiresAt: Date.now() - 10000 });
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(401);
    });

    it('validates token successfully with KV', async () => {
      mockKv.get.mockResolvedValue({ eventId: '1', expiresAt: Date.now() + 10000 });
      mockDb.prepare.mockImplementation((query) => {
        if (query.includes('SELECT * FROM events')) return { bind: () => ({ first: async () => ({ id: '1', name: 'Event' }) }) };
        if (query.includes('DELETE')) return { bind: () => ({ run: vi.fn() }) };
      });
      vi.mocked(createGalleryToken).mockResolvedValue('signed_token');
      
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.token).toBe('signed_token');
      expect(mockKv.delete).toHaveBeenCalledWith('qr:123');
    });

    it('validates token successfully with DB fallback', async () => {
      mockDb.prepare.mockImplementation((query) => {
        if (query.includes('SELECT event_id')) return { bind: () => ({ first: async () => ({ event_id: '1', expires_at: Date.now() + 10000 }) }) };
        if (query.includes('SELECT * FROM events')) return { bind: () => ({ first: async () => null }) };
        if (query.includes('DELETE')) return { bind: () => ({ run: vi.fn() }) };
      });
      vi.mocked(createGalleryToken).mockResolvedValue('signed_token');
      
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv({ SESSION_KV: undefined }));
      
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.token).toBe('signed_token');
    });

    it('handles AuthConfigurationError in validate', async () => {
      mockKv.get.mockResolvedValue({ eventId: '1', expiresAt: Date.now() + 10000 });
      mockDb.prepare.mockReturnValue({ bind: () => ({ run: vi.fn(), first: async () => ({ id: 1 }) }) });
      vi.mocked(createGalleryToken).mockRejectedValue(new AuthConfigurationError('config error'));
      
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      
      expect(res.status).toBe(503);
    });

    it('handles generic error in validate', async () => {
      mockKv.get.mockResolvedValue({ eventId: '1', expiresAt: Date.now() + 10000 });
      mockDb.prepare.mockReturnValue({ bind: () => ({ run: vi.fn(), first: async () => ({ id: 1 }) }) });
      vi.mocked(createGalleryToken).mockRejectedValue(new Error('Generic'));
      
      const res = await app.request('/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token: '123' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      
      expect(res.status).toBe(500);
    });
  });

  describe('GET /photos', () => {
    it('returns photos', async () => {
      vi.mocked(getGalleryPrincipal).mockReturnValue({ eventId: '1' } as any);
      const mockPhotos = [{ id: 1, ai_tags: '["tag1"]', size: 100 }];
      mockDb.prepare.mockReturnValue({ bind: () => ({ all: async () => ({ results: mockPhotos }) }) });
      
      const res = await app.request('/photos', {}, getEnv());
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.photos[0].id).toBe(1);
      expect(data.photos[0].aiTags).toEqual(['tag1']);
    });

    it('handles error', async () => {
      vi.mocked(getGalleryPrincipal).mockImplementation(() => { throw new Error('Auth err'); });
      const res = await app.request('/photos', {}, getEnv());
      expect(res.status).toBe(500);
    });

    it('filters by curationStatus', async () => {
      vi.mocked(getGalleryPrincipal).mockReturnValue({ eventId: '1' } as any);
      const mockBind = vi.fn().mockReturnValue({ all: async () => ({ results: [] }) });
      mockDb.prepare.mockReturnValue({ bind: mockBind });
      
      await app.request('/photos?curationStatus=APPROVED', {}, getEnv());
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('curation_status = ?'));
      expect(mockBind).toHaveBeenCalledWith('1', 'APPROVED');
    });
  });

  describe('GET /photos/:id/download-url', () => {
    it('returns 401 if no auth header', async () => {
      const res = await app.request('/photos/1/download-url', {}, getEnv());
      expect(res.status).toBe(401);
    });

    it('returns 404 if photo not found', async () => {
      vi.mocked(getGalleryPrincipal).mockReturnValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => null }) });
      
      const res = await app.request('/photos/1/download-url', {
        headers: { 'Authorization': 'Bearer token123' }
      }, getEnv());
      expect(res.status).toBe(404);
    });

    it('returns download url on success', async () => {
      vi.mocked(getGalleryPrincipal).mockReturnValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ r2_path: 'path/to/img.jpg' }) }) });
      
      const res = await app.request('/photos/1/download-url', {
        headers: { 'Authorization': 'Bearer token123' }
      }, getEnv());
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.downloadUrl).toContain('token=token123');
    });

    it('handles error', async () => {
      vi.mocked(getGalleryPrincipal).mockImplementation(() => { throw new Error(); });
      const res = await app.request('/photos/1/download-url', {
        headers: { 'Authorization': 'Bearer token123' }
      }, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('GET /photos/:id/file', () => {
    it('returns 401 if no token in query', async () => {
      const res = await app.request('/photos/1/file', {}, getEnv());
      expect(res.status).toBe(401);
    });

    it('returns 503 if AuthConfigurationError', async () => {
      vi.mocked(verifyGalleryToken).mockRejectedValue(new AuthConfigurationError('config error'));
      const res = await app.request('/photos/1/file?token=123', {}, getEnv());
      expect(res.status).toBe(503);
    });

    it('returns 401 if token invalid', async () => {
      vi.mocked(verifyGalleryToken).mockResolvedValue(null as any);
      const res = await app.request('/photos/1/file?token=123', {}, getEnv());
      expect(res.status).toBe(401);
    });

    it('returns 404 if photo not found in DB', async () => {
      vi.mocked(verifyGalleryToken).mockResolvedValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => null }) });
      const res = await app.request('/photos/1/file?token=123', {}, getEnv());
      expect(res.status).toBe(404);
    });

    it('returns 404 if photo not found in R2', async () => {
      vi.mocked(verifyGalleryToken).mockResolvedValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ r2_path: 'img.jpg' }) }) });
      mockBucket.head.mockResolvedValue(null);
      const res = await app.request('/photos/1/file?token=123', {}, getEnv());
      expect(res.status).toBe(404);
    });

    it('returns 416 for bad range', async () => {
      vi.mocked(verifyGalleryToken).mockResolvedValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ r2_path: 'img.jpg' }) }) });
      mockBucket.head.mockResolvedValue({ size: 1000 });
      
      const res = await app.request('/photos/1/file?token=123', {
        headers: { 'Range': 'bytes=2000-3000' }
      }, getEnv());
      expect(res.status).toBe(416);
    });

    it('returns full file', async () => {
      vi.mocked(verifyGalleryToken).mockResolvedValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ r2_path: 'img.jpg' }) }) });
      mockBucket.head.mockResolvedValue({ size: 1000 });
      mockBucket.get.mockResolvedValue({
        body: 'file_content',
        writeHttpMetadata: vi.fn(),
        httpEtag: 'etag'
      });
      
      const res = await app.request('/photos/1/file?token=123', {}, getEnv());
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Length')).toBe('1000');
    });

    it('returns partial file', async () => {
      vi.mocked(verifyGalleryToken).mockResolvedValue({ eventId: '1' } as any);
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ r2_path: 'img.jpg' }) }) });
      mockBucket.head.mockResolvedValue({ size: 1000 });
      mockBucket.get.mockResolvedValue({
        body: 'partial_content',
        writeHttpMetadata: vi.fn(),
        httpEtag: 'etag'
      });
      
      const res = await app.request('/photos/1/file?token=123', {
        headers: { 'Range': 'bytes=0-99' }
      }, getEnv());
      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Length')).toBe('100');
    });

    it('handles unexpected errors', async () => {
      vi.mocked(verifyGalleryToken).mockRejectedValue(new Error());
      const res = await app.request('/photos/1/file?token=123', {}, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('POST /photos/raw/export-batch', () => {
    it('returns 400 if missing eventId', async () => {
      const res = await app.request('/photos/raw/export-batch', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status).toBe(400);
    });

    it('creates export job and manifest', async () => {
      mockDb.prepare.mockImplementation((query) => {
        if (query.includes('SELECT')) return { bind: () => ({ all: async () => ({ results: [{ id: 1, ai_tags: '["test"]' }] }) }) };
        if (query.includes('INSERT')) return { bind: () => ({ run: vi.fn() }) };
      });
      
      const res = await app.request('/photos/raw/export-batch', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1', filterTags: ['test'] }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      
      expect(res.status).toBe(200);
      expect(mockBucket.put).toHaveBeenCalled();
    });

    it('handles JSON parse errors in tags', async () => {
      mockDb.prepare.mockImplementation((query) => {
        if (query.includes('SELECT')) return { bind: () => ({ all: async () => ({ results: [{ id: 1, ai_tags: 'invalid json' }] }) }) };
        if (query.includes('INSERT')) return { bind: () => ({ run: vi.fn() }) };
      });
      
      const res = await app.request('/photos/raw/export-batch', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1', filterTags: ['test'] }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      
      expect(res.status).toBe(200);
    });

    it('handles errors', async () => {
      mockDb.prepare.mockImplementation(() => { throw new Error(); });
      const res = await app.request('/photos/raw/export-batch', {
        method: 'POST',
        body: JSON.stringify({ eventId: '1' }),
        headers: { 'Content-Type': 'application/json' }
      }, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('GET /photos/raw/export-jobs', () => {
    it('returns jobs', async () => {
      mockDb.prepare.mockReturnValue({ all: async () => ({ results: [{ id: 'job1' }] }) });
      const res = await app.request('/photos/raw/export-jobs', {}, getEnv());
      expect(res.status).toBe(200);
    });

    it('handles errors', async () => {
      mockDb.prepare.mockImplementation(() => { throw new Error(); });
      const res = await app.request('/photos/raw/export-jobs', {}, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('GET /photos/raw/export-jobs/:id', () => {
    it('returns 404 if not found', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => null }) });
      const res = await app.request('/photos/raw/export-jobs/1', {}, getEnv());
      expect(res.status).toBe(404);
    });

    it('returns job', async () => {
      mockDb.prepare.mockReturnValue({ bind: () => ({ first: async () => ({ id: 'job1' }) }) });
      const res = await app.request('/photos/raw/export-jobs/1', {}, getEnv());
      expect(res.status).toBe(200);
    });

    it('handles errors', async () => {
      mockDb.prepare.mockImplementation(() => { throw new Error(); });
      const res = await app.request('/photos/raw/export-jobs/1', {}, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('GET /photos/raw/export-jobs/:id/manifest', () => {
    it('returns 404 if not found', async () => {
      mockBucket.get.mockResolvedValue(null);
      const res = await app.request('/photos/raw/export-jobs/1/manifest', {}, getEnv());
      expect(res.status).toBe(404);
    });

    it('returns manifest', async () => {
      mockBucket.get.mockResolvedValue({ json: async () => ({ jobId: '1' }) });
      const res = await app.request('/photos/raw/export-jobs/1/manifest', {}, getEnv());
      expect(res.status).toBe(200);
    });

    it('handles errors', async () => {
      mockBucket.get.mockImplementation(() => { throw new Error(); });
      const res = await app.request('/photos/raw/export-jobs/1/manifest', {}, getEnv());
      expect(res.status).toBe(500);
    });
  });

  describe('AI routes', () => {
    it('POST /search faceSearchUnavailable bad json', async () => {
      const res = await app.request('/search', { method: 'POST', body: '{ bad json' });
      expect(res.status).toBe(400);
    });

    it('POST /search faceSearchUnavailable missing vector', async () => {
      const res = await app.request('/search', { method: 'POST', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } });
      expect(res.status).toBe(400);
    });

    it('POST /search faceSearchUnavailable invalid vector length', async () => {
      const res = await app.request('/search', { method: 'POST', body: JSON.stringify({ vector: [1, 2, 3] }), headers: { 'Content-Type': 'application/json' } });
      expect(res.status).toBe(400);
    });

    it('POST /search faceSearchUnavailable invalid vector content', async () => {
      const vector = Array(128).fill('a');
      const res = await app.request('/search', { method: 'POST', body: JSON.stringify({ vector }), headers: { 'Content-Type': 'application/json' } });
      expect(res.status).toBe(400);
    });

    it('POST /search faceSearchUnavailable valid vector', async () => {
      const vector = Array(128).fill(1);
      const res = await app.request('/search', { method: 'POST', body: JSON.stringify({ vector }), headers: { 'Content-Type': 'application/json' } });
      expect(res.status).toBe(503);
    });

    it('POST /ai/face-search calls faceSearchUnavailable', async () => {
      const vector = Array(128).fill(1);
      const res = await app.request('/ai/face-search', { method: 'POST', body: JSON.stringify({ vector }), headers: { 'Content-Type': 'application/json' } });
      expect(res.status).toBe(503);
    });

    it('POST /ai/magic-eraser works', async () => {
      const res = await app.request('/ai/magic-eraser', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: 'test.jpg' }),
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status).toBe(200);
    });

    it('POST /ai/magic-eraser works without imageurl', async () => {
      const res = await app.request('/ai/magic-eraser', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status).toBe(200);
    });

    it('POST /ai/magic-eraser handles error', async () => {
      const res = await app.request('/ai/magic-eraser', { method: 'POST', body: 'invalid json' });
      expect(res.status).toBe(500);
    });
  });

  describe('Static routes', () => {
    it('GET /gallery/products', async () => {
      const res = await app.request('/gallery/products');
      expect(res.status).toBe(200);
    });

    it('GET /resorts/branding', async () => {
      const res = await app.request('/resorts/branding');
      expect(res.status).toBe(200);
    });
  });
});
