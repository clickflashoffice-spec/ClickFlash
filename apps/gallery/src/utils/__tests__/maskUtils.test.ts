import { binarizeMaskPixels } from '../maskUtils';

describe('binarizeMaskPixels', () => {
  it('creates an opaque 8-bit binary mask at the 0.5 threshold', () => {
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 127,
      255, 0, 0, 128,
      255, 0, 0, 255,
    ]);

    const result = binarizeMaskPixels(pixels, 0.5);

    expect(result).toEqual({ selectedPixels: 2, totalPixels: 3 });
    expect([...pixels]).toEqual([
      0, 0, 0, 255,
      255, 255, 255, 255,
      255, 255, 255, 255,
    ]);
  });

  it('rejects invalid thresholds and malformed RGBA buffers', () => {
    expect(() => binarizeMaskPixels(new Uint8ClampedArray(4), 1.1)).toThrow(
      'between 0 and 1',
    );
    expect(() => binarizeMaskPixels(new Uint8ClampedArray(3))).toThrow(
      'divisible by four',
    );
  });
});
