import { useState, useCallback, useEffect, useRef } from "react";
import { Photo, Album } from "@/types";
import { apiService } from "@/services/apiService";
import { logger } from "@/utils/logger";

interface UsePhotoDataReturn {
  photos: Photo[];
  album: Album | null;
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
  refresh: () => Promise<void>;
  cancel: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function usePhotoData(albumId: string): UsePhotoDataReturn {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!albumId) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    isCancelledRef.current = false;

    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    let lastError: Error | null = null;
    let currentDelay = RETRY_DELAY;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (isCancelledRef.current) {
          return;
        }

        // Parallel fetch with retry
        const [fetchedAlbum, fetchedPhotos] = await Promise.all([
          apiService.getAlbum(albumId),
          apiService.getPhotosPaginated(1, 1000, albumId),
        ]);

        if (isCancelledRef.current) {
          return;
        }

        setAlbum(fetchedAlbum);
        setPhotos(fetchedPhotos.items);
        setRetryCount(attempt);
        setIsLoading(false);
        return;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (isCancelledRef.current) {
          return;
        }

        // Log error with retry info
        logger.warn(
          `Failed to load editor data (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
          { error: lastError.message, albumId }
        );

        // Don't retry on client errors (4xx except 429)
        if (lastError.message.match(/4\d{2}/) && !lastError.message.includes('429')) {
          break;
        }

        // Don't retry on abort
        if (lastError.name === 'AbortError') {
          return;
        }

        // All retries exhausted
        if (attempt === MAX_RETRIES) {
          break;
        }

        setRetryCount(attempt + 1);

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2;
      }
    }

    // All retries failed
    logger.error("Failed to load editor data after all retries", lastError as Error);
    setError(lastError);
    setIsLoading(false);

  }, [albumId]);

  // Initial load
  useEffect(() => {
    loadData();
    
    // Cleanup on unmount
    return () => {
      cancel();
    };
  }, [loadData, cancel]);

  return {
    photos,
    album,
    isLoading,
    error,
    retryCount,
    refresh: loadData,
    cancel,
  };
}
