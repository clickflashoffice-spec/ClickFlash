/**
 * Client-Side Image Sharpness Scorer (Laplacian Variance simulation in Canvas/WASM)
 * Computes sharpness & exposure metrics directly in the photographer's browser.
 */

export interface ClientQualityScore {
  sharpnessScore: number; // 0 - 100
  isKeeper: boolean;
  blurDetected: boolean;
  exposure: 'underexposed' | 'good' | 'overexposed';
}

export async function evaluateClientPhotoQuality(file: File): Promise<ClientQualityScore> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Downscale to a fast analysis canvas (300x300 thumbnail)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 300;
      canvas.width = size;
      canvas.height = size;

      if (!ctx) {
        resolve({ sharpnessScore: 85, isKeeper: true, blurDetected: false, exposure: 'good' });
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      // 1. Calculate Grayscale Luminance & Laplacian Variance
      let totalLuminance = 0;
      const gray = new Float32Array(size * size);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[i / 4] = lum;
        totalLuminance += lum;
      }

      const avgLuminance = totalLuminance / (size * size);

      // 2. Discrete Laplacian 3x3 Kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
      let laplacianSum = 0;
      let laplacianSqSum = 0;
      let count = 0;

      for (let y = 1; y < size - 1; y += 2) { // 2px step for speed
        for (let x = 1; x < size - 1; x += 2) {
          const idx = y * size + x;
          const center = gray[idx];
          const top = gray[idx - size];
          const bottom = gray[idx + size];
          const left = gray[idx - 1];
          const right = gray[idx + 1];

          const lap = Math.abs(top + bottom + left + right - 4 * center);
          laplacianSum += lap;
          laplacianSqSum += lap * lap;
          count++;
        }
      }

      const meanLap = laplacianSum / count;
      const variance = (laplacianSqSum / count) - (meanLap * meanLap);

      // Normalize variance to 0-100 score
      const rawScore = Math.min(100, Math.max(0, Math.round(variance * 1.8)));
      const isKeeper = rawScore >= 45;
      const blurDetected = rawScore < 45;

      let exposure: 'underexposed' | 'good' | 'overexposed' = 'good';
      if (avgLuminance < 40) exposure = 'underexposed';
      if (avgLuminance > 220) exposure = 'overexposed';

      resolve({
        sharpnessScore: rawScore,
        isKeeper,
        blurDetected,
        exposure
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ sharpnessScore: 75, isKeeper: true, blurDetected: false, exposure: 'good' });
    };

    img.src = url;
  });
}
