/**
 * imgproxy URL Builder — OSS image transformation CDN
 * 
 * Replaces custom sharp-based image processing with URL-based transformations.
 * imgproxy runs as a Docker service and transforms images on-the-fly.
 * 
 * @see https://docs.imgproxy.net/generating_the_url
 * @see docker-compose.dev.yml (imgproxy service on port 8082)
 */

const IMGPROXY_BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.VITE_IMGPROXY_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_IMGPROXY_URL) ||
  'http://localhost:8082';

export type ImgproxyFormat = 'jpg' | 'png' | 'webp' | 'avif';

export type ImgproxyGravity =
  | 'no'   // north
  | 'so'   // south
  | 'ea'   // east
  | 'we'   // west
  | 'ce'   // center
  | 'sm'   // smart (content-aware)
  | 'fp';  // focus point

export interface ImgproxyOptions {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Resize type: fit, fill, auto, force */
  resizeType?: 'fit' | 'fill' | 'auto' | 'force';
  /** Gravity for cropping */
  gravity?: ImgproxyGravity;
  /** Output format */
  format?: ImgproxyFormat;
  /** Quality 1-100 */
  quality?: number;
  /** Blur radius (gaussian) */
  blur?: number;
  /** Sharpen amount */
  sharpen?: number;
  /** DPR multiplier (e.g., 2 for retina) */
  dpr?: number;
  /** Enable watermark overlay */
  watermark?: boolean;
  /** Cache-Control max-age in seconds */
  cacheTtl?: number;
}

/**
 * Build an imgproxy URL for on-the-fly image transformation.
 * 
 * @example
 * // Resize to 800x600, auto-format for browser
 * buildImgproxyUrl('s3://photos/album-1/photo-001.jpg', { width: 800, height: 600 })
 * 
 * // Gallery thumbnail with smart crop
 * buildImgproxyUrl(photoUrl, { width: 300, height: 300, resizeType: 'fill', gravity: 'sm' })
 * 
 * // High-quality download with watermark
 * buildImgproxyUrl(photoUrl, { width: 2400, quality: 95, watermark: true })
 */
export function buildImgproxyPath(sourceUrl: string, options: ImgproxyOptions = {}): string {
  const parts: string[] = [];

  // Resize
  const rt = options.resizeType || 'fit';
  const w = options.width || 0;
  const h = options.height || 0;
  parts.push(`rs:${rt}:${w}:${h}`);

  // Gravity
  if (options.gravity) {
    parts.push(`g:${options.gravity}`);
  }

  // Quality
  if (options.quality) {
    parts.push(`q:${options.quality}`);
  }

  // DPR
  if (options.dpr && options.dpr > 1) {
    parts.push(`dpr:${options.dpr}`);
  }

  // Blur
  if (options.blur) {
    parts.push(`bl:${options.blur}`);
  }

  // Sharpen
  if (options.sharpen) {
    parts.push(`sh:${options.sharpen}`);
  }

  // Watermark
  if (options.watermark) {
    parts.push('wm:1:ce:0:0:0.3');
  }

  // Format extension
  const ext = options.format ? `.${options.format}` : '';

  // Encode source URL (plain text mode for simplicity in dev)
  const encodedSource = `plain/${sourceUrl}`;

  // Build final URL: /processing_options/plain/source_url@extension
  const processingPath = parts.join('/');
  return `${processingPath}/${encodedSource}${ext ? `@${options.format}` : ''}`;
}

/**
 * Build an imgproxy URL for on-the-fly image transformation (insecure).
 * 
 * @example
 * // Resize to 800x600, auto-format for browser
 * buildImgproxyUrl('s3://photos/album-1/photo-001.jpg', { width: 800, height: 600 })
 */
export function buildImgproxyUrl(sourceUrl: string, options: ImgproxyOptions = {}): string {
  const path = buildImgproxyPath(sourceUrl, options);
  return `${IMGPROXY_BASE_URL}/insecure/${path}`;
}

const hexDecode = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
const urlSafeBase64 = (base64: string) => base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/**
 * Generate a signed imgproxy URL for production use.
 * In production, URLs should be signed with IMGPROXY_KEY and IMGPROXY_SALT.
 */
export async function buildSignedImgproxyUrl(
    sourceUrl: string, 
    options: ImgproxyOptions = {}, 
    keyHex?: string, 
    saltHex?: string
): Promise<string> {
  const path = buildImgproxyPath(sourceUrl, options);
  
  const key = keyHex || process.env.IMGPROXY_KEY || process.env.VITE_IMGPROXY_KEY;
  const salt = saltHex || process.env.IMGPROXY_SALT || process.env.VITE_IMGPROXY_SALT;

  if (!key || !salt) {
      // Fallback to insecure if no keys provided
      return `${IMGPROXY_BASE_URL}/insecure/${path}`;
  }

  const keyBytes = hexDecode(key);
  const saltBytes = hexDecode(salt);
  
  const encoder = new TextEncoder();
  const pathBytes = encoder.encode('/' + path);
  
  const dataToSign = new Uint8Array(saltBytes.length + pathBytes.length);
  dataToSign.set(saltBytes);
  dataToSign.set(pathBytes, saltBytes.length);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataToSign);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const signatureUrlSafe = urlSafeBase64(signatureBase64);

  return `${IMGPROXY_BASE_URL}/${signatureUrlSafe}/${path}`;
}

/**
 * Preset configurations for common ClickFlash use cases
 */
export const IMGPROXY_PRESETS = {
  /** Gallery thumbnail grid (300x300 smart crop) */
  thumbnail: { width: 300, height: 300, resizeType: 'fill', gravity: 'sm', format: 'webp', quality: 80 } as ImgproxyOptions,
  
  /** Gallery preview (max 1200px wide, maintain aspect) */
  preview: { width: 1200, resizeType: 'fit', format: 'webp', quality: 85 } as ImgproxyOptions,
  
  /** Full-screen kiosk display (max 1920px, high quality) */
  kioskDisplay: { width: 1920, resizeType: 'fit', format: 'webp', quality: 90 } as ImgproxyOptions,
  
  /** Guest download with watermark */
  watermarkedDownload: { width: 2400, quality: 95, watermark: true, format: 'jpg' } as ImgproxyOptions,
  
  /** Blurred background placeholder (tiny, blurred) */
  placeholder: { width: 40, blur: 10, format: 'webp', quality: 30 } as ImgproxyOptions,
  
  /** Face search thumbnail (square crop for face matching UI) */
  faceThumbnail: { width: 150, height: 150, resizeType: 'fill', gravity: 'sm', format: 'webp', quality: 75 } as ImgproxyOptions,
} as const;
