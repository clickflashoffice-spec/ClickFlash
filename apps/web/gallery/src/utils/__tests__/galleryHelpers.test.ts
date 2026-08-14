/**
 * Unit Tests for Gallery Helpers
 */

import {
  generateThumbnailUrl,
  sortPhotosByDate,
  filterPhotosByTag,
  calculateTotalPrice,
  formatAccessCode
} from '../galleryHelpers';

describe('Gallery Helpers', () => {
  describe('generateThumbnailUrl', () => {
    it('should generate thumbnail URL from photo URL', () => {
      const photoUrl = 'https://example.com/photos/wedding/image1.jpg';
      const thumbUrl = generateThumbnailUrl(photoUrl);
      
      expect(thumbUrl).toContain('thumb');
      expect(thumbUrl).toContain('image1.jpg');
    });

    it('should handle URLs with query parameters', () => {
      const photoUrl = 'https://example.com/photos/image.jpg?size=large';
      const thumbUrl = generateThumbnailUrl(photoUrl);
      
      expect(thumbUrl).not.toContain('?');
    });

    it('should return placeholder for invalid URLs', () => {
      const result = generateThumbnailUrl('');
      expect(result).toContain('placeholder');
    });
  });

  describe('sortPhotosByDate', () => {
    const photos = [
      { id: '1', createdAt: '2026-02-20T10:00:00Z' },
      { id: '2', createdAt: '2026-02-19T10:00:00Z' },
      { id: '3', createdAt: '2026-02-21T10:00:00Z' },
    ];

    it('should sort by newest first (descending)', () => {
      const sorted = sortPhotosByDate(photos, 'desc');
      expect(sorted[0].id).toBe('3');
      expect(sorted[2].id).toBe('2');
    });

    it('should sort by oldest first (ascending)', () => {
      const sorted = sortPhotosByDate(photos, 'asc');
      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('should handle photos without dates', () => {
      const photosWithNulls = [
        { id: '1', createdAt: '2026-02-20T10:00:00Z' },
        { id: '2', createdAt: null },
      ];
      const sorted = sortPhotosByDate(photosWithNulls, 'desc');
      expect(sorted.length).toBe(2);
    });
  });

  describe('filterPhotosByTag', () => {
    const photos = [
      { id: '1', tags: ['wedding', 'ceremony'] },
      { id: '2', tags: ['reception', 'party'] },
      { id: '3', tags: ['wedding', 'portrait'] },
    ];

    it('should filter by single tag', () => {
      const filtered = filterPhotosByTag(photos, 'wedding');
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toContain('1');
      expect(filtered.map(p => p.id)).toContain('3');
    });

    it('should filter by multiple tags (AND)', () => {
      const filtered = filterPhotosByTag(photos, ['wedding', 'portrait']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('3');
    });

    it('should return empty array when no matches', () => {
      const filtered = filterPhotosByTag(photos, 'nonexistent');
      expect(filtered).toHaveLength(0);
    });

    it('should return all photos when no tag specified', () => {
      const filtered = filterPhotosByTag(photos, '');
      expect(filtered).toHaveLength(3);
    });
  });

  describe('calculateTotalPrice', () => {
    it('should calculate total for digital downloads', () => {
      const items = [
        { type: 'digital', price: 5.99, quantity: 3 },
        { type: 'digital', price: 5.99, quantity: 2 },
      ];
      expect(calculateTotalPrice(items)).toBe(29.95);
    });

    it('should calculate total for prints', () => {
      const items = [
        { type: 'print', price: 12.99, quantity: 2 },
        { type: 'print', price: 9.99, quantity: 1 },
      ];
      expect(calculateTotalPrice(items)).toBe(35.97);
    });

    it('should calculate mixed cart total', () => {
      const items = [
        { type: 'digital', price: 5.99, quantity: 1 },
        { type: 'print', price: 12.99, quantity: 1 },
      ];
      expect(calculateTotalPrice(items)).toBe(18.98);
    });

    it('should return 0 for empty cart', () => {
      expect(calculateTotalPrice([])).toBe(0);
    });

    it('should apply discount when provided', () => {
      const items = [{ type: 'digital', price: 10, quantity: 1 }];
      expect(calculateTotalPrice(items, 0.2)).toBe(8); // 20% off
    });
  });

  describe('formatAccessCode', () => {
    it('should uppercase and trim input', () => {
      expect(formatAccessCode('abc123')).toBe('ABC123');
      expect(formatAccessCode('  ABC  ')).toBe('ABC');
    });

    it('should remove invalid characters', () => {
      expect(formatAccessCode('ABC-123_DEF')).toBe('ABC-123_DEF');
      expect(formatAccessCode('ABC@123')).toBe('ABC123');
      expect(formatAccessCode('ABC 123')).toBe('ABC123');
    });

    it('should limit to max length', () => {
      const longCode = 'A'.repeat(100);
      expect(formatAccessCode(longCode).length).toBeLessThanOrEqual(50);
    });
  });
});
