/**
 * Hi-Res Lazy Loader
 * 
 * Manages background loading of full-resolution images for the editor.
 * Designed to work within 8GB RAM constraints by loading only one Hi-Res at a time.
 * 
 * Strategy:
 * 1. User opens editor with 2K preview (fast, low RAM)
 * 2. Hi-Res fetch starts in background (requestIdleCallback)
 * 3. When loaded, seamlessly swap preview -> Hi-Res
 * 4. Cleanup on navigation to prevent memory leaks
 */

interface HiResLoadOptions {
    photoId: string;
    url: string;
    onProgress?: (loaded: number, total: number) => void;
    onComplete?: (blob: Blob) => void;
    onError?: (error: Error) => void;
}

class HiResLoader {
    private currentFetch: AbortController | null = null;
    private cache: Map<string, Blob> = new Map();
    private maxCacheSize = 1; // Only cache 1 Hi-Res image at a time (RAM constraint)

    /**
     * Fetch Hi-Res image in background
     * Uses requestIdleCallback to avoid blocking UI
     */
    async load(options: HiResLoadOptions): Promise<Blob | null> {
        const { photoId, url, onProgress, onComplete, onError } = options;

        // Check cache first
        if (this.cache.has(photoId)) {
            const blob = this.cache.get(photoId)!;
            onComplete?.(blob);
            return blob;
        }

        // Cancel any existing fetch
        this.cancel();

        // Create new abort controller
        this.currentFetch = new AbortController();

        try {
            // Wait for idle time before starting fetch
            await this.waitForIdle();

            const response = await fetch(url, {
                signal: this.currentFetch.signal
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Hi-Res: ${response.statusText}`);
            }

            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            // Stream the response to track progress
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }

            const chunks: Uint8Array[] = [];
            let loaded = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                loaded += value.length;

                onProgress?.(loaded, total);
            }

            // Combine chunks into blob
            const blob = new Blob(chunks as BlobPart[], { type: 'image/jpeg' });

            // Update cache (evict old entries if needed)
            this.updateCache(photoId, blob);

            onComplete?.(blob);
            return blob;

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                // Fetch was cancelled, this is expected
                return null;
            }

            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err);
            return null;
        } finally {
            this.currentFetch = null;
        }
    }

    /**
     * Cancel current fetch
     */
    cancel(): void {
        if (this.currentFetch) {
            this.currentFetch.abort();
            this.currentFetch = null;
        }
    }

    /**
     * Clear cache to free memory
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Wait for browser idle time
     */
    private waitForIdle(): Promise<void> {
        return new Promise((resolve) => {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => resolve());
            } else {
                // Fallback for browsers without requestIdleCallback
                setTimeout(() => resolve(), 100);
            }
        });
    }

    /**
     * Update cache with LRU eviction
     */
    private updateCache(photoId: string, blob: Blob): void {
        // If cache is full, remove oldest entry
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(photoId, blob);
    }
}

// Singleton instance
export const hiResLoader = new HiResLoader();

/**
 * React Hook for Hi-Res loading
 */
export function useHiResLoader(photoId: string | null, url: string | null) {
    const [hiResBlob, setHiResBlob] = React.useState<Blob | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (!photoId || !url) {
            setHiResBlob(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        hiResLoader.load({
            photoId,
            url,
            onProgress: (loaded, total) => {
                if (total > 0) {
                    setProgress(Math.round((loaded / total) * 100));
                }
            },
            onComplete: (blob) => {
                setHiResBlob(blob);
                setIsLoading(false);
                setProgress(100);
            },
            onError: (err) => {
                setError(err);
                setIsLoading(false);
            }
        });

        // Cleanup on unmount or photo change
        return () => {
            hiResLoader.cancel();
        };
    }, [photoId, url]);

    return { hiResBlob, isLoading, progress, error };
}

// Add React import at top
import React from 'react';
