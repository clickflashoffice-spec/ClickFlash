import { useCallback, useRef } from 'react';

interface VRAMProtectionOptions {
  /** Maximum number of preview data-URLs to keep in memory at once. */
  maxPreviewsInMemory: number;
  /** Downscale target width (pixels). Aspect ratio is preserved. */
  previewMaxWidth: number;
  /** Downscale target height (pixels). Aspect ratio is preserved. */
  previewMaxHeight: number;
}

interface UseVRAMProtectionReturn {
  /**
   * Returns a downsampled JPEG data-URL for the given file.
   * Results are cached by `id`; the oldest entry is evicted when
   * the cache exceeds `maxPreviewsInMemory`.
   */
  getPreview: (id: string, file: File) => Promise<string>;
}

/**
 * Generates memory-bounded image previews.
 * Uses an insertion-order LRU cache (Map) so the oldest preview is
 * dropped when the cap is reached, preventing unbounded VRAM growth
 * when a photographer drops hundreds of RAW files at once.
 */
export function useVRAMProtection({
  maxPreviewsInMemory,
  previewMaxWidth,
  previewMaxHeight,
}: VRAMProtectionOptions): UseVRAMProtectionReturn {
  const cacheRef = useRef<Map<string, string>>(new Map());

  const getPreview = useCallback(
    async (id: string, file: File): Promise<string> => {
      const cache = cacheRef.current;

      // Cache hit — return existing thumbnail
      if (cache.has(id)) {
        return cache.get(id)!;
      }

      // Evict the oldest entry when at capacity (Map preserves insertion order)
      if (cache.size >= maxPreviewsInMemory) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) {
          cache.delete(oldestKey);
        }
      }

      const dataUrl = await generatePreview(file, previewMaxWidth, previewMaxHeight);
      cache.set(id, dataUrl);
      return dataUrl;
    },
    [maxPreviewsInMemory, previewMaxWidth, previewMaxHeight],
  );

  return { getPreview };
}

/**
 * Draws `file` onto a canvas scaled to fit within `maxWidth` × `maxHeight`
 * and returns a JPEG data-URL at 70% quality.
 */
function generatePreview(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Scale to fit within bounds, maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('2D canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image preview: ${file.name}`));
    };

    img.src = objectUrl;
  });
}
