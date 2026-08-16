// @vitest-environment jsdom
/**
 * Unit Tests for Touch Kiosk Image Utilities
 */

import {
  base64ToBlob,
  blobToBase64,
  validatePhotoUrl,
  getImageDimensions,
  fileToGenerativePart
} from '../imageUtils';

describe('Image Utilities', () => {
  describe('base64ToBlob', () => {
    it('should convert base64 string to Blob', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const blob = base64ToBlob(base64, 'text/plain');
      
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBe(11);
    });

    it('should handle empty base64 string', () => {
      const blob = base64ToBlob('', 'image/jpeg');
      expect(blob.size).toBe(0);
    });
  });

  describe('blobToBase64', () => {
    it('should convert Blob to base64 string', async () => {
      const text = 'Hello World';
      const blob = new Blob([text], { type: 'text/plain' });
      
      const base64 = await blobToBase64(blob);
      expect(typeof base64).toBe('string');
      expect(base64).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should handle image blob', async () => {
      // Create a minimal JPEG blob (1x1 pixel)
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0xFF, 0xD9
      ]);
      const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
      
      const base64 = await blobToBase64(blob);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('validatePhotoUrl', () => {
    it('should return false for undefined/null', async () => {
      expect(await validatePhotoUrl(undefined)).toBe(false);
      expect(await validatePhotoUrl(null as unknown as string)).toBe(false);
    });

    it('should return false for empty string', async () => {
      expect(await validatePhotoUrl('')).toBe(false);
    });

    it('should validate blob URLs', async () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);
      
      expect(await validatePhotoUrl(blobUrl)).toBe(true);
      URL.revokeObjectURL(blobUrl);
    });

    it('should validate data URLs', async () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      expect(await validatePhotoUrl(dataUrl)).toBe(true);
    });

    it('should validate http/https URLs', async () => {
      expect(await validatePhotoUrl('http://example.com/image.jpg')).toBe(true);
      expect(await validatePhotoUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      expect(await validatePhotoUrl('ftp://example.com/image.jpg')).toBe(false);
      expect(await validatePhotoUrl('javascript:alert(1)')).toBe(false);
      expect(await validatePhotoUrl('not-a-url')).toBe(false);
    });

    it('should validate Blob objects', async () => {
      const imageBlob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
      expect(await validatePhotoUrl(imageBlob)).toBe(true);
    });

    it('should reject empty Blob', async () => {
      const emptyBlob = new Blob([], { type: 'image/jpeg' });
      expect(await validatePhotoUrl(emptyBlob)).toBe(false);
    });
  });

  describe('getImageDimensions', () => {
    it('should return null for invalid image', async () => {
      const originalImage = global.Image;
      class MockImageError {
        onload: any = null;
        onerror: any = null;
        set src(_v: string) {
          setTimeout(() => this.onerror?.(), 0);
        }
      }
      global.Image = MockImageError as any;
      try {
        const invalidBlob = new Blob(['not-an-image'], { type: 'text/plain' });
        const dimensions = await getImageDimensions(invalidBlob);
        expect(dimensions).toBeNull();
      } finally {
        global.Image = originalImage;
      }
    });

    it('should handle blob URLs', async () => {
      const originalImage = global.Image;
      class MockImageSuccess {
        onload: any = null;
        onerror: any = null;
        naturalWidth = 100;
        naturalHeight = 100;
        set src(_v: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      global.Image = MockImageSuccess as any;
      try {
        const blob = new Blob(['gif-bytes'], { type: 'image/gif' });
        const dimensions = await getImageDimensions(blob);
        expect(dimensions).toEqual({ width: 100, height: 100 });
      } finally {
        global.Image = originalImage;
      }
    });
  });

  describe('fileToGenerativePart', () => {
    it('should convert File to generative part format', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const result = await fileToGenerativePart(file);
      
      expect(result).toHaveProperty('mimeType', 'text/plain');
      expect(result).toHaveProperty('data');
      expect(typeof result.data).toBe('string');
      expect(result.data).toBe('dGVzdCBjb250ZW50'); // base64 of "test content"
    });

    it('should handle image files', async () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      const file = new File([jpegBytes], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await fileToGenerativePart(file);
      
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.data).toBeDefined();
    });
  });
});
