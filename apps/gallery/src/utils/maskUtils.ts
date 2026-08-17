export function binarizeMaskPixels(dataOrCanvas: Uint8ClampedArray | HTMLCanvasElement, threshold: number = 0.5): { selectedPixels: number } {
  let selectedPixels = 0;
  const byteThreshold = threshold <= 1 ? threshold * 255 : threshold;

  if (dataOrCanvas instanceof Uint8ClampedArray || (typeof dataOrCanvas === 'object' && 'length' in dataOrCanvas)) {
    const data = dataOrCanvas as Uint8ClampedArray;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha >= byteThreshold) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
        selectedPixels++;
      } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      }
    }
  }

  return { selectedPixels };
}
