/**
 * useWatermark.ts — React hook for client-side watermarking
 *
 * Wraps watermark-js-plus for component-level usage in the Gallery Portal.
 */
import { useEffect, useRef, useCallback } from "react";
import { applyVisibleWatermark, type WatermarkOptions, WATERMARK_PRESETS } from "@/utils/clientWatermark";

interface UseWatermarkOptions extends WatermarkOptions {
  /** Enable/disable watermark (default: true) */
  enabled?: boolean;
  /** Use a preset instead of custom options */
  preset?: keyof typeof WATERMARK_PRESETS;
}

/**
 * Hook to apply a visible watermark to a container element.
 */
export function useWatermark(options: UseWatermarkOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<any>(null);

  const { enabled = true, preset, ...customOptions } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current) {
      watermarkRef.current?.destroy?.();
      watermarkRef.current = null;
      return;
    }

    const effectiveOptions = preset ? WATERMARK_PRESETS[preset] : customOptions;
    watermarkRef.current = applyVisibleWatermark(
      containerRef.current,
      effectiveOptions as WatermarkOptions
    );

    return () => {
      watermarkRef.current?.destroy?.();
      watermarkRef.current = null;
    };
  }, [enabled, preset]);

  const destroy = useCallback(() => {
    watermarkRef.current?.destroy?.();
    watermarkRef.current = null;
  }, []);

  return { containerRef, destroy };
}
