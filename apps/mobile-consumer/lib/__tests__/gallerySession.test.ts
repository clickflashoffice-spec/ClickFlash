import {
  clearGalleryToken,
  getGalleryToken,
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

  it('clears an expired token', () => {
    setGalleryToken('signed-gallery-token');
    clearGalleryToken();
    expect(getGalleryToken()).toBeNull();
  });

  it('rejects empty tokens', () => {
    expect(() => setGalleryToken('   ')).toThrow(TypeError);
    expect(getGalleryToken()).toBeNull();
  });
});
