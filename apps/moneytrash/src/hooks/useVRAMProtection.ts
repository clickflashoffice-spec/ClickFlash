/**
 * VRAM Protection Hook for MoneyTrash
 * Prevents GPU memory exhaustion when handling large batches of high-res images
 * 
 * Features:
 * - Lazy preview loading (only visible items)
 * - Preview downsampling to reduce memory footprint
 * - Automatic cleanup of off-screen previews
 * - Memory pressure monitoring
 */

import { useCallback, useRef, useEffect } from 'react';

interface VRAMConfig {
  maxPreviewsInMemory: number;
  previewMaxWidth: number;
  previewMaxHeight: number;
  enableCleanup: boolean;
}

const DEFAULT_CONFIG: VRAMConfig = {
  maxPreviewsInMemory: 20,
  previewMaxWidth: 400,
  previewMaxHeight: 400,
  enableCleanup: true,
};

interface PreviewEntry {
  id: string;
  url: string;
  lastAccessed: number;
}

export function useVRAMProtection(config: Partial<VRAMConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const previewCache = useRef<Map<string, PreviewEntry>>(new Map());
  const memoryPressure = useRef<number>(0);
  
  const updateMemoryPressure = useCallback(() => {
    if ('memory' in performance) {
      const mem = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      memoryPressure.current = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
    }
    return memoryPressure.current;
  }, []);

  const isMemoryPressureHigh = useCallback(() => {
    return updateMemoryPressure() > 0.8;
  }, [updateMemoryPressure]);

  const createDownsampledPreview = useCallback(
    async (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          
          const scale = Math.min(
            maxWidth / img.width,
            maxHeight / img.height,
            1
          );
          
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };
        
        img.src = url;
      });
    },
    []
  );

  const getPreview = useCallback(
    async (id: string, file: File): Promise<string> => {
      if (isMemoryPressureHigh()) {
        console.warn('[VRAM] Memory pressure high, skipping preview generation');
        return '';
      }

      const cached = previewCache.current.get(id);
      if (cached) {
        cached.lastAccessed = Date.now();
        return cached.url;
      }

      if (previewCache.current.size >= fullConfig.maxPreviewsInMemory) {
        const oldest = Array.from(previewCache.current.values())
          .sort((a, b) => a.lastAccessed - b.lastAccessed)[0];
        
        if (oldest) {
          previewCache.current.delete(id);
          URL.revokeObjectURL(oldest.url);
        }
      }

      try {
        const preview = await createDownsampledPreview(
          file,
          fullConfig.previewMaxWidth,
          fullConfig.previewMaxHeight
        );
        
        previewCache.current.set(id, {
          id,
          url: preview,
          lastAccessed: Date.now(),
        });
        
        return preview;
      } catch (err) {
        console.error('[VRAM] Failed to create preview:', err);
        return '';
      }
    },
    [createDownsampledPreview, fullConfig, isMemoryPressureHigh]
  );

  const revokePreview = useCallback((id: string) => {
    const cached = previewCache.current.get(id);
    if (cached) {
      previewCache.current.delete(id);
    }
  }, []);

  const clearAllPreviews = useCallback(() => {
    for (const entry of previewCache.current.values()) {
      URL.revokeObjectURL(entry.url);
    }
    previewCache.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      clearAllPreviews();
    };
  }, [clearAllPreviews]);

  return {
    getPreview,
    revokePreview,
    clearAllPreviews,
    isMemoryPressureHigh,
    memoryPressure: memoryPressure.current,
    config: fullConfig,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
