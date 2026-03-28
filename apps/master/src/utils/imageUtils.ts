
/**
 * Image Utilities
 * 
 * Utility functions for image conversion and manipulation.
 * Used primarily for AI image editing (Gemini API) and photo processing.
 * Includes a BlobRegistry for strict memory management of temporary assets.
 */

// Centralized registry for tracking active blob URLs
const blobRegistry = new Set<string>();

// RAM-Capped Thumbnail Cache (Performance Ultimate)
interface ThumbnailCacheEntry {
  dataUrl: string;
  size: number;  // Estimated size in bytes
  lastAccessed: number;
}

class ThumbnailCache {
  private cache = new Map<string, ThumbnailCacheEntry>();
  private currentSize = 0;
  private readonly MAX_SIZE_MB = 50; // 50MB max cache
  private readonly MAX_SIZE_BYTES = this.MAX_SIZE_MB * 1024 * 1024;

  private estimateSize(dataUrl: string): number {
    // Base64 encoding: 4 chars = 3 bytes, so length * 0.75
    return Math.ceil(dataUrl.length * 0.75);
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const evicted = this.cache.get(oldestKey);
      if (evicted) {
        this.currentSize -= evicted.size;
        this.cache.delete(oldestKey);
      }
    }
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.dataUrl;
    }
    return null;
  }

  set(key: string, dataUrl: string): void {
    const size = this.estimateSize(dataUrl);

    // Evict until we have space
    while (this.currentSize + size > this.MAX_SIZE_BYTES && this.cache.size > 0) {
      this.evictLRU();
    }

    // If single item is too large, don't cache it
    if (size > this.MAX_SIZE_BYTES) return;

    this.cache.set(key, {
      dataUrl,
      size,
      lastAccessed: Date.now()
    });
    this.currentSize += size;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  getStats(): { count: number; sizeMB: number } {
    return {
      count: this.cache.size,
      sizeMB: Math.round(this.currentSize / (1024 * 1024) * 100) / 100
    };
  }
}

const thumbnailCache = new ThumbnailCache();

/**
 * Fetches an image from a URL and converts it to base64 inline data format.
 * 
 * This function is suitable for the Gemini API's `inlineData` field.
 * Supports both HTTP/HTTPS URLs and data URIs.
 * 
 * Features:
 * - Handles data URIs directly (no fetch needed)
 * - Fetches and converts HTTP/HTTPS URLs
 * - Extracts MIME type automatically
 * - Error handling for network failures
 * 
 * @param {string} imageUrl - The URL of the image to convert (can be http/https or a data URI)
 * @returns {Promise<{ mimeType: string; data: string }>} Promise that resolves with mimeType and base64 data
 * @throws {Error} If the image cannot be fetched or converted
 * 
 * @example
 * ```ts
 * const { mimeType, data } = await urlToInlineData('https://example.com/image.jpg');
 * // Use with Gemini API
 * const result = await model.generateContent([{ inlineData: { mimeType, data } }]);
 * ```
 */
export async function urlToInlineData(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  // If the URL is a data URI, extract parts directly.
  if (imageUrl.startsWith('data:')) {
    const [header, data] = imageUrl.split(',');
    if (data && header.includes(';base64')) {
      const mimeType = header.substring(5, header.indexOf(';'));
      return { mimeType, data };
    }
  }

  // For all other URLs (http, https, or fallbacks from data URI), fetch them.
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    const mimeType = blob.type;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // The result includes the data URI prefix, so we split it off.
        resolve({ mimeType, data: base64data.split(',')[1] });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting URL to InlineData:", error);
    throw new Error("Could not convert image URL to InlineData.");
  }
}

/**
 * Converts a File object directly to Gemini API inline data format.
 * 
 * Useful for file uploads from input elements.
 * 
 * @param {File} file - The File object from an input element
 * @returns {Promise<{ mimeType: string; data: string }>} Promise that resolves with mimeType and base64 data
 * @throws {Error} If the file cannot be read
 * 
 * @example
 * ```ts
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * const { mimeType, data } = await fileToGenerativePart(file);
 * ```
 */
export function fileToGenerativePart(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const data = base64data.split(',')[1];
      resolve({
        mimeType: file.type,
        data
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 string to a Blob object.
 * 
 * Handles base64 strings with or without data URI prefix.
 * 
 * @param {string} base64 - Base64 encoded string (with or without data URI prefix)
 * @param {string} [contentType=''] - MIME type for the blob
 * @returns {Blob} Blob object created from base64 data
 * 
 * @example
 * ```ts
 * const blob = base64ToBlob(base64String, 'image/jpeg');
 * const url = URL.createObjectURL(blob);
 * ```
 */
export function base64ToBlob(base64: string, contentType: string = ''): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

/**
 * Converts a Blob to a Base64 string.
 * @param blob The Blob to convert.
 * @returns A promise that resolves with the Base64 string (without data URI prefix).
 */
/**
 * Converts a Blob to a base64 string.
 * 
 * @param {Blob} blob - Blob object to convert
 * @returns {Promise<string>} Promise that resolves with base64 string (includes data URI prefix)
 * 
 * @example
 * ```ts
 * const base64 = await blobToBase64(imageBlob);
 * // base64 will be: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
 * ```
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URI prefix "data:image/jpeg;base64,"
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Creates a small thumbnail from a File object with RAM-capped caching.
 * 
 * Uses Canvas API for high-performance downsampling.
 * This is critical for preventing UI lag when previewing massive photo batches.
 * 
 * Features (Performance Ultimate):
 * - LRU cache with 50MB cap
 * - Automatic eviction on memory pressure
 * - Cache key based on file name + size + modified time
 * 
 * @param {File} file - The source image file
 * @param {number} [maxWidth=200] - Target width
 * @param {number} [maxHeight=200] - Target height
 * @returns {Promise<string>} Promise that resolves with a data URL of the thumbnail
 */
export function createThumbnail(file: File, maxWidth: number = 200, maxHeight: number = 200): Promise<string> {
  // Generate cache key from file metadata
  const cacheKey = `${file.name}_${file.size}_${file.lastModified}_${maxWidth}x${maxHeight}`;

  // Check cache first
  const cached = thumbnailCache.get(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const url = createSafeObjectURL(file);
    const img = new Image();

    img.onload = () => {
      revokeBlob(url);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      // Cache the result
      thumbnailCache.set(cacheKey, dataUrl);

      resolve(dataUrl);
    };

    img.onerror = (err) => {
      revokeBlob(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Registers a blob URL for lifecycle tracking.
 * @param url The blob URL to track
 */
export function registerBlob(url: string): void {
  if (url && url.startsWith('blob:')) {
    blobRegistry.add(url);
  }
}

/**
 * Revokes a blob URL and removes it from the registry.
 * @param url The blob URL to revoke
 */
export function revokeBlob(url: string): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
      blobRegistry.delete(url);
    } catch (e) {
      console.warn('Failed to revoke blob URL:', url, e);
    }
  }
}

/**
 * Emergency cleanup of all registered blob URLs.
 * Should be called during major navigation or when memory pressure is high.
 */
export function cleanupAllBlobs(): void {
  const count = blobRegistry.size;
  if (count === 0) return;

  // Blob URLs cleanup (silent operation in production)
  blobRegistry.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      // Ignore errors during mass cleanup
    }
  });
  blobRegistry.clear();
}

/**
 * Wraps URL.createObjectURL to automatically register the resulting URL.
 * @param obj The object to create a URL for
 * @returns The registered blob URL
 */
export function createSafeObjectURL(obj: Blob | MediaSource): string {
  const url = URL.createObjectURL(obj);
  registerBlob(url);
  return url;
}

/**
 * Clears the thumbnail cache (useful for forcing regeneration or freeing memory).
 */
export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

/**
 * Gets current thumbnail cache statistics.
 * @returns Object with count and size in MB
 */
export function getThumbnailCacheStats(): { count: number; sizeMB: number } {
  return thumbnailCache.getStats();
}

/**
 * Creates a high-quality proxy image (blob) from a File object.
 * Target resolution: 1920px (long edge).
 * Format: JPEG, quality 0.8.
 * 
 * @param {File} file - The source image file
 * @returns {Promise<Blob>} Promise that resolves with the proxy Blob
 */
export function createProxyImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = createSafeObjectURL(file);
    const img = new Image();

    img.onload = () => {
      revokeBlob(url);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      const MAX_DIMENSION = 1920;

      if (width > height) {
        if (width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context for proxy generation"));
        return;
      }

      // High quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create proxy blob"));
        }
      }, 'image/jpeg', 0.8);
    };

    img.onerror = (err) => {
      revokeBlob(url);
      reject(err);
    };

    img.src = url;
  });
}
