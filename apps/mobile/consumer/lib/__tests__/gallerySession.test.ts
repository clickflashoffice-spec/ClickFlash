import { describe, it, expect, vi } from 'vitest';
import {
  clearGalleryToken,
  getFaceSearchMatches,
  getGalleryToken,
  setFaceSearchMatches,
  setGalleryToken,
} from '../gallerySession';

describe('gallerySession', () => {
  beforeEach(() => {
    clearGalleryToken();
  });

  it('keeps the validated token for the current app process', () => {
    setGalleryToken('  signed-gallery-token  ');
    expect(getGalleryToken()).toBe('signed-gallery-token');
  });

  it('stores defensive copies of server-returned face matches', () => {
    const matches = [{ id: 'photo-1', thumbnailUrl: 'https://example.test/1' }];
    setFaceSearchMatches(matches);

    const stored = getFaceSearchMatches();
    expect(stored).toEqual(matches);
    expect(stored).not.toBe(matches);
    expect(stored[0]).not.toBe(matches[0]);
  });

  it('clears an expired token', () => {
    setGalleryToken('signed-gallery-token');
    clearGalleryToken();
    expect(getGalleryToken()).toBeNull();
    expect(getFaceSearchMatches()).toEqual([]);
  });

  it('rejects empty tokens', () => {
    expect(() => setGalleryToken('   ')).toThrow(TypeError);
    expect(getGalleryToken()).toBeNull();
  });
});
