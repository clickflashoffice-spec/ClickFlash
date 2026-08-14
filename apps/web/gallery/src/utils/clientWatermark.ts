/**
 * clientWatermark.ts — Client-side watermarking with watermark-js-plus
 *
 * Provides both visible and blind (invisible) watermarking for guest photos
 * in the Gallery Portal. Defense-in-depth layer alongside server-side LSB
 * watermarking in cloud-backend.
 *
 * @see watermark.ts in cloud-backend for server-side steganographic watermarking
 */
// @ts-ignore
import * as watermarkModule from "watermark-js-plus";

const WatermarkClass: any =
  (watermarkModule as any).Watermark ||
  (watermarkModule as any).default ||
  watermarkModule;

export interface WatermarkOptions {
  /** Watermark text (default: "ClickFlash © {year}") */
  text?: string;
  /** Font size in pixels (default: 24) */
  fontSize?: number;
  /** Text color with alpha (default: "rgba(255,255,255,0.3)") */
  color?: string;
  /** Position: 'bottom-right' | 'bottom-left' | 'center' | 'tile' */
  position?: "bottom-right" | "bottom-left" | "center" | "tile";
  /** Rotation angle in degrees (default: -20 for tile, 0 for corner) */
  rotate?: number;
}

/**
 * Apply a visible text watermark overlay to an image element.
 * Used for preview images in the gallery before purchase.
 */
export function applyVisibleWatermark(
  container: HTMLElement,
  options: WatermarkOptions = {}
): any {
  const text = options.text || `ClickFlash © ${new Date().getFullYear()}`;
  const isTile = options.position === "tile";

  const watermark = new WatermarkClass({
    content: text,
    width: isTile ? 200 : undefined,
    height: isTile ? 200 : undefined,
    fontSize: options.fontSize || 24,
    fontColor: options.color || "rgba(255,255,255,0.3)",
    rotate: options.rotate ?? (isTile ? -20 : 0),
    parent: container,
    zIndex: 1000,
    monitor: true, // re-applies if user removes via DevTools
  });

  watermark.create();
  return watermark;
}

/**
 * Apply a blind (invisible) watermark to a canvas element.
 * Embeds text data into the image's frequency domain — invisible to
 * the naked eye but recoverable for copyright verification.
 */
export async function applyBlindWatermark(
  canvas: HTMLCanvasElement,
  text: string
): Promise<HTMLCanvasElement> {
  const watermark = new WatermarkClass({
    content: text,
    mode: "blind",
    fontSize: 16,
    fontColor: "#000",
    parent: canvas.parentElement || document.body,
  });

  await watermark.create();
  return canvas;
}

/**
 * Decode a blind watermark from an image for verification.
 * Returns the decoded watermark canvas.
 */
export async function decodeBlindWatermark(
  imageUrl: string,
  container: HTMLElement
): Promise<void> {
  const watermark = new WatermarkClass({
    content: "",
    mode: "blind",
    parent: container,
  });

  // The decoded watermark will be rendered into the container
  await watermark.decode?.(imageUrl);
}

/**
 * ClickFlash default watermark presets
 */
export const WATERMARK_PRESETS = {
  /** Light overlay for gallery previews */
  galleryPreview: {
    text: "PREVIEW",
    fontSize: 48,
    color: "rgba(255,255,255,0.15)",
    position: "tile" as const,
    rotate: -30,
  },

  /** Subtle corner branding for shared photos */
  branding: {
    text: "ClickFlash",
    fontSize: 18,
    color: "rgba(255,255,255,0.4)",
    position: "bottom-right" as const,
  },

  /** Bold protection for unpurchased prints */
  proofProtection: {
    text: "PROOF — NOT FOR REPRODUCTION",
    fontSize: 36,
    color: "rgba(255,0,0,0.2)",
    position: "tile" as const,
    rotate: -25,
  },
} as const;
