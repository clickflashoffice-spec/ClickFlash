import { logger } from './logger';

export interface VintageFilterOptions {
  mode: 'classic_bw' | 'high_contrast_bw' | 'sepia_film' | 'fotio_studio';
  grainIntensity?: number; // 0 to 1
  vignetteStrength?: number; // 0 to 1
  contrastBoost?: number; // e.g. 1.2
}

/**
 * Applies a real-time CPU/canvas-based Vintage or Black & White filter to an HTMLImageElement or Canvas.
 * Returns a base64 data URL or modified canvas suitable for kiosk display without network roundtrips.
 */
export async function applyVintageFilterToCanvas(
  sourceCanvasOrImage: HTMLImageElement | HTMLCanvasElement,
  options: VintageFilterOptions = { mode: 'classic_bw', grainIntensity: 0.15, vignetteStrength: 0.4 }
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = sourceCanvasOrImage.width || 1920;
  const height = sourceCanvasOrImage.height || 1080;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Draw initial image
  ctx.drawImage(sourceCanvasOrImage, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const mode = options.mode;
  const contrast = options.contrastBoost || (mode === 'high_contrast_bw' || mode === 'fotio_studio' ? 1.35 : 1.1);
  const intercept = 128 * (1 - contrast);

  // Pixel manipulation loop
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contrast adjustment
    r = r * contrast + intercept;
    g = g * contrast + intercept;
    b = b * contrast + intercept;

    if (mode === 'classic_bw' || mode === 'high_contrast_bw' || mode === 'fotio_studio') {
      // Luminance monochrome conversion (Rec. 601 / Fotio punchy curve)
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = Math.min(255, Math.max(0, luma));
      data[i + 1] = Math.min(255, Math.max(0, luma));
      data[i + 2] = Math.min(255, Math.max(0, luma));
    } else if (mode === 'sepia_film') {
      // Sepia film tone
      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      data[i] = Math.min(255, Math.max(0, tr));
      data[i + 1] = Math.min(255, Math.max(0, tg));
      data[i + 2] = Math.min(255, Math.max(0, tb));
    }

    // Add Film Grain if configured
    if (options.grainIntensity && options.grainIntensity > 0) {
      const noise = (Math.random() - 0.5) * (options.grainIntensity * 80);
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Apply Vignette overlay using radial gradient
  if (options.vignetteStrength && options.vignetteStrength > 0) {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(cx, cy) * 1.2;
    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.85, options.vignetteStrength)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // If Fotio Studio mode, add subtle white studio framing border
  if (mode === 'fotio_studio') {
    const borderWidth = Math.round(Math.min(width, height) * 0.035);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
  }

  logger.info(`[VintageFilter] Successfully applied ${mode} filter (grain: ${options.grainIntensity}, vignette: ${options.vignetteStrength})`);
  return canvas.toDataURL('image/jpeg', 0.92);
}
