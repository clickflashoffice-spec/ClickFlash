export interface BinarizedMaskResult {
  selectedPixels: number;
  totalPixels: number;
}

export function binarizeMaskPixels(
  pixels: Uint8ClampedArray,
  probabilityThreshold = 0.5,
): BinarizedMaskResult {
  if (probabilityThreshold < 0 || probabilityThreshold > 1) {
    throw new RangeError('Mask probability threshold must be between 0 and 1');
  }
  if (pixels.length % 4 !== 0) {
    throw new RangeError('RGBA mask data length must be divisible by four');
  }

  let selectedPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const probability = pixels[offset + 3] / 255;
    const value = probability >= probabilityThreshold ? 255 : 0;
    if (value === 255) selectedPixels++;
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }

  return { selectedPixels, totalPixels: pixels.length / 4 };
}
