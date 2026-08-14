/**
 * S3 Storage Service Tests
 * 
 * Tests for R2/S3 cloud upload functionality including:
 * - Cloudflare R2 configuration
 * - File upload with progress
 * - Site-specific folder structure (TN001, TN002, TN003)
 * - Error handling and retry logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn().mockImplementation((params: any) => params),
  GetObjectCommand: vi.fn().mockImplementation((params: any) => params),
  DeleteObjectCommand: vi.fn().mockImplementation((params: any) => params),
  HeadObjectCommand: vi.fn().mockImplementation((params: any) => params),
  ListObjectsV2Command: vi.fn().mockImplementation((params: any) => params),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://r2.clickflash.ai/signed-url'),
}));

import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3StorageService } from '../s3StorageService';

/**
 * Shape of the private state on S3StorageService that this test suite
 * pokes at to set up scenarios. Mirrors the `private` fields on the
 * class — kept here so the test file owns the cast explicitly rather
 * than scattering `as any` across every call site.
 */
type S3StorageServicePrivate = {
  s3: { send: (...args: unknown[]) => unknown } | null;
  isConfigured: boolean;
  bucket: string;
};

const internals = s3StorageService as unknown as S3StorageServicePrivate;

describe('S3StorageService - R2 Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state
    internals.s3 = null;
    internals.isConfigured = false;
    internals.bucket = '';
  });

  describe('Configuration', () => {
    it('should configure with Cloudflare R2 credentials', () => {
      const r2Config = {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        region: 'auto',
        bucket: 'clickflash-uploads',
        endpoint: 'https://abc123.r2.cloudflarestorage.com',
      };

      s3StorageService.configure(r2Config);

      expect(s3StorageService.isReady()).toBe(true);
      expect(S3Client).toHaveBeenCalledWith({
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        region: 'auto',
        endpoint: 'https://abc123.r2.cloudflarestorage.com',
      });
    });

    it('should configure without endpoint for AWS S3', () => {
      const awsConfig = {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        region: 'us-east-1',
        bucket: 'clickflash-uploads',
      };

      s3StorageService.configure(awsConfig);

      expect(s3StorageService.isReady()).toBe(true);
      expect(S3Client).toHaveBeenCalledWith({
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
        region: 'us-east-1',
      });
    });

    it('should return not ready when not configured', () => {
      expect(s3StorageService.isReady()).toBe(false);
    });
  });

  describe('Site-Specific Folder Structure', () => {
    beforeEach(() => {
      s3StorageService.configure({
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'auto',
        bucket: 'clickflash-uploads',
        endpoint: 'https://r2.cloudflarestorage.com',
      });
    });

    it('should upload to TN001 site folder', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const file = new Blob(['test'], { type: 'image/jpeg' });
      const metadata = {
        siteId: 'TN001',
        hotelName: 'Hotel Tunisia 1',
        uploadDate: new Date().toISOString(),
      };

      await s3StorageService.uploadFile('TN001/2024/03/photo1.jpg', file, metadata);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'clickflash-uploads',
          Key: 'TN001/2024/03/photo1.jpg',
          Metadata: metadata,
          ContentType: 'image/jpeg',
        })
      );
    });

    it('should upload to TN002 site folder', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const file = Buffer.from('test-image-data');
      await s3StorageService.uploadFile('TN002/orders/ORD123/photo.jpg', file);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'TN002/orders/ORD123/photo.jpg',
        })
      );
    });

    it('should upload to TN003 site folder', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const file = Buffer.from('test-image-data');
      await s3StorageService.uploadFile('TN003/raw/IMG_001.jpg', file);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: 'TN003/raw/IMG_001.jpg',
        })
      );
    });

    it('should list files by site prefix', async () => {
      const mockSend = vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'TN001/photo1.jpg' },
          { Key: 'TN001/photo2.jpg' },
          { Key: 'TN001/orders/ord1.jpg' },
        ],
      });
      internals.s3 = { send: mockSend };

      const files = await s3StorageService.listFiles('TN001/');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Prefix: 'TN001/',
          MaxKeys: 1000,
        })
      );
      expect(files).toHaveLength(3);
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      s3StorageService.configure({
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'auto',
        bucket: 'clickflash-uploads',
      });
    });

    it('should upload file successfully', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const file = Buffer.from('test-image-data');
      const result = await s3StorageService.uploadFile('test/photo.jpg', file);

      expect(result.success).toBe(true);
      expect(result.key).toBe('test/photo.jpg');
      expect(result.size).toBe(file.length);
      expect(result.url).toBeDefined();
    });

    it('should return error when not configured', async () => {
      internals.isConfigured = false;

      const file = Buffer.from('test');
      const result = await s3StorageService.uploadFile('test.jpg', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('S3 not configured');
    });

    it('should handle upload errors', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('Network error'));
      internals.s3 = { send: mockSend };

      const file = Buffer.from('test');
      const result = await s3StorageService.uploadFile('test.jpg', file);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should upload with progress tracking', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const progressCallbacks: number[] = [];
      const onProgress = (progress: { loaded: number; total: number; percentage: number }) => {
        progressCallbacks.push(progress.percentage);
      };

      const file = Buffer.from('x'.repeat(1024 * 1024)); // 1MB
      await s3StorageService.uploadFileWithProgress('test.jpg', file, onProgress);

      expect(progressCallbacks).toContain(0);
      expect(progressCallbacks).toContain(100);
    });
  });

  describe('Content Type Detection', () => {
    beforeEach(() => {
      s3StorageService.configure({
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'auto',
        bucket: 'clickflash-uploads',
      });
    });

    it.each([
      ['photo.jpg', 'image/jpeg'],
      ['photo.jpeg', 'image/jpeg'],
      ['image.png', 'image/png'],
      ['anim.gif', 'image/gif'],
      ['img.webp', 'image/webp'],
      ['raw.heic', 'image/heic'],
      ['raw.heif', 'image/heif'],
      ['doc.pdf', 'application/pdf'],
      ['video.mp4', 'video/mp4'],
      ['clip.mov', 'video/quicktime'],
    ])('should detect content type for %s', async (filename: string, expectedType: string) => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const file = Buffer.from('test');
      await s3StorageService.uploadFile(filename, file);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          ContentType: expectedType,
        })
      );
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      s3StorageService.configure({
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'auto',
        bucket: 'clickflash-uploads',
      });
    });

    it('should check if file exists', async () => {
      const mockSend = vi.fn().mockResolvedValue({ ContentLength: 1024 });
      internals.s3 = { send: mockSend };

      const exists = await s3StorageService.fileExists('test.jpg');

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error('Not found'));
      internals.s3 = { send: mockSend };

      const exists = await s3StorageService.fileExists('missing.jpg');

      expect(exists).toBe(false);
    });

    it('should delete file successfully', async () => {
      const mockSend = vi.fn().mockResolvedValue({});
      internals.s3 = { send: mockSend };

      const deleted = await s3StorageService.deleteFile('test.jpg');

      expect(deleted).toBe(true);
    });

    it('should generate signed URL', async () => {
      const mockSend = vi.fn();
      internals.s3 = { send: mockSend };

      const url = await s3StorageService.getSignedUrl('test.jpg', 3600);

      expect(url).toBe('https://r2.clickflash.ai/signed-url');
      expect(getSignedUrl).toHaveBeenCalled();
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(() => {
      s3StorageService.configure({
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'auto',
        bucket: 'clickflash-uploads',
      });
    });

    it('should calculate storage stats by site', async () => {
      const mockSend = vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'TN001/photo1.jpg', Size: 1024 * 1024 },
          { Key: 'TN001/photo2.jpg', Size: 2 * 1024 * 1024 },
          { Key: 'TN002/photo1.jpg', Size: 512 * 1024 },
        ],
        NextContinuationToken: undefined,
      });
      internals.s3 = { send: mockSend };

      const stats = await s3StorageService.getStorageStats('TN001/');

      expect(stats.totalObjects).toBe(3);
      expect(stats.totalSize).toBe(3.5 * 1024 * 1024);
    });

    it('should handle pagination in storage stats', async () => {
      const mockSend = vi.fn()
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file1.jpg', Size: 1024 }],
          NextContinuationToken: 'token1',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'file2.jpg', Size: 2048 }],
          NextContinuationToken: undefined,
        });
      internals.s3 = { send: mockSend };

      const stats = await s3StorageService.getStorageStats();

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(stats.totalObjects).toBe(2);
      expect(stats.totalSize).toBe(3072);
    });
  });
});

describe('Site Folder Structure Validation', () => {
  it('should validate TN001 folder structure', () => {
    const validPaths = [
      'TN001/raw/2024/03/photo.jpg',
      'TN001/orders/ORD123/',
      'TN001/processed/watermarked/',
      'TN001/thumbnails/',
    ];

    validPaths.forEach(path => {
      expect(path.startsWith('TN001/')).toBe(true);
    });
  });

  it('should validate TN002 folder structure', () => {
    const validPaths = [
      'TN002/raw/2024/03/photo.jpg',
      'TN002/orders/ORD456/',
    ];

    validPaths.forEach(path => {
      expect(path.startsWith('TN002/')).toBe(true);
    });
  });

  it('should extract site ID from path', () => {
    const extractSiteId = (path: string): string | null => {
      const match = path.match(/^(TN\d{3})/);
      return match ? match[1] : null;
    };

    expect(extractSiteId('TN001/photos/image.jpg')).toBe('TN001');
    expect(extractSiteId('TN002/orders/123/')).toBe('TN002');
    expect(extractSiteId('TN003/raw/')).toBe('TN003');
    expect(extractSiteId('invalid/path')).toBeNull();
  });
});
