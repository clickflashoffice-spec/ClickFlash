import { vi } from 'vitest';


vi.mock('../../../src/services/pb', () => ({
  pb: {
    collection: vi.fn().mockReturnValue({
      getFullList: vi.fn().mockResolvedValue([]),
      getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0, page: 1, perPage: 20, totalPages: 0 }),
      getOne: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue(true),
    }),
    baseUrlValue: 'http://localhost:8090',
    getCsrfToken: vi.fn().mockResolvedValue('csrf-token'),
  },
}));

describe('photoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('validateManualEdits', () => {
    it('should clamp values to valid ranges', async () => {
      const { validateManualEdits } = await import('../../../src/services/api/photoService');
      
      const result = validateManualEdits({
        exposure: 500,
        contrast: -500,
        grayscale: 200,
      });
      
      expect(result.exposure).toBe(100);
      expect(result.contrast).toBe(-100);
      expect(result.grayscale).toBe(100);
    });

    it('should handle NaN values', async () => {
      const { validateManualEdits } = await import('../../../src/services/api/photoService');
      
      const result = validateManualEdits({
        exposure: NaN,
      } as any);
      
      expect(result.exposure).toBe(0);
    });

    it('should preserve valid values', async () => {
      const { validateManualEdits } = await import('../../../src/services/api/photoService');
      
      const result = validateManualEdits({
        exposure: 50,
        contrast: 10,
      });
      
      expect(result.exposure).toBe(50);
      expect(result.contrast).toBe(10);
    });
  });

  describe('getAssetPath', () => {
    it('should generate correct path for album and photo', async () => {
      const { getAssetPath } = await import('../../../src/services/api/photoService');
      
      const path = getAssetPath('album-1', 'photo-1', 'highres');
      
      expect(path).toContain('album-1');
      expect(path).toContain('photo-1');
    });

    it('should generate path for thumbs', async () => {
      const { getAssetPath } = await import('../../../src/services/api/photoService');
      
      const path = getAssetPath('album-1', 'photo-1', 'thumbs');
      
      expect(path).toContain('album-1');
    });

    it('should return empty string for missing albumId', async () => {
      const { getAssetPath } = await import('../../../src/services/api/photoService');
      
      const path = getAssetPath('', 'photo-1', 'highres');
      
      expect(path).toBe('');
    });
  });

  describe('getPhotoUrl', () => {
    it('should return full URLs unchanged', async () => {
      const { getPhotoUrl } = await import('../../../src/services/api/photoService');
      
      const url = getPhotoUrl({ url: 'https://example.com/photo.jpg', id: 'p1' } as any);
      
      expect(url).toBe('https://example.com/photo.jpg');
    });

    it('should return blob URLs unchanged', async () => {
      const { getPhotoUrl } = await import('../../../src/services/api/photoService');
      
      const url = getPhotoUrl({ url: 'blob:http://localhost:8090/abc123', id: 'p1' } as any);
      
      expect(url).toBe('blob:http://localhost:8090/abc123');
    });

    it('should construct URL for relative paths', async () => {
      const { getPhotoUrl } = await import('../../../src/services/api/photoService');
      
      const url = getPhotoUrl({ url: 'photo.jpg', id: 'photo-1' } as any);
      
      expect(url).toContain('localhost:8090');
      expect(url).toContain('photo-1');
    });
  });
});
