
import { useCallback, useRef } from 'react';

/**
 * Hook to preload assets during browser idle time.
 * Uses requestIdleCallback (with polyfill) to avoid blocking the main thread.
 */
export function useIdlePreload() {
    // Queue of URLs to preload
    const queue = useRef<Set<string>>(new Set());
    const isProcessing = useRef(false);

    const processQueue = useCallback((deadline: IdleDeadline) => {
        isProcessing.current = true;

        while (
            (deadline.timeRemaining() > 0 || deadline.didTimeout) &&
            queue.current.size > 0
        ) {
            const url = queue.current.values().next().value;
            if (!url) break;

            queue.current.delete(url);

            // Create a new image to force browser cache
            const img = new Image();
            img.src = url;
            // No need to append to DOM, just fetching wraps it in cache
        }

        if (queue.current.size > 0) {
            // Re-schedule if items remain
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(processQueue);
            } else {
                setTimeout(() => processQueue({
                    didTimeout: false,
                    timeRemaining: () => 50
                } as IdleDeadline), 200);
            }
        } else {
            isProcessing.current = false;
        }
    }, []);

    const preload = useCallback((urls: string[]) => {
        let added = false;
        urls.forEach(url => {
            if (url && !queue.current.has(url)) {
                queue.current.add(url);
                added = true;
            }
        });

        if (added && !isProcessing.current) {
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(processQueue);
            } else {
                // Fallback for browsers without requestIdleCallback
                setTimeout(() => processQueue({
                    didTimeout: false,
                    timeRemaining: () => 50
                } as IdleDeadline), 200);
            }
        }
    }, [processQueue]);

    return { preload };
}
