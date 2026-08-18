/**
 * LazyImage Component
 * 
 * Lazy-loads images using Intersection Observer API.
 * Only loads images when they're about to enter the viewport.
 * 
 * Features:
 * - Intersection Observer for efficient viewport detection
 * - Placeholder support (blur, skeleton, or custom)
 * - Error handling with fallback
 * - Configurable root margin for preloading
 * - Supports all standard img attributes
 * 
 * Performance Benefits:
 * - Reduces initial page load time
 * - Saves bandwidth by loading only visible images
 * - Improves perceived performance
 * - Better for large photo galleries
 */

import React, { useState, useRef, useEffect, ImgHTMLAttributes, forwardRef } from 'react';
import { revokeBlob } from '../../utils/imageUtils';
import { useIdlePreload } from '../../hooks/useIdlePreload';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
    src: string;
    lowResSrc?: string; // Optional low-resolution image to show while main image is loading
    alt: string;
    placeholder?: 'blur' | 'skeleton' | 'none' | React.ReactNode;
    rootMargin?: string; // Intersection Observer root margin
    onLoad?: () => void;
    onError?: () => void;
    fallbackSrc?: string; // Fallback image if main image fails to load
    className?: string;
    containerClassName?: string;
    preloadUrls?: string[]; // URLs to preload when this image comes into view
    overflowVisible?: boolean; // New prop to allow seeing content outside boundaries (for straightened photos)
    children?: React.ReactNode;
}

const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(({
    src,
    lowResSrc,
    alt,
    placeholder = 'skeleton',
    rootMargin = '50px',
    onLoad,
    onError,
    fallbackSrc,
    className = '',
    containerClassName = '',
    preloadUrls = [],
    overflowVisible = false,
    style,
    children,
    ...imgProps
}, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [lowResLoaded, setLowResLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const { preload } = useIdlePreload();

    useEffect(() => {
        const containerElement = containerRef.current;
        if (!containerElement) return;

        if (!('IntersectionObserver' in window)) {
            setIsInView(true);
            setImageSrc(src);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        setImageSrc(src);
                        // Rule: Zero-Block IO
                        // Trigger idle preloading for next assets when this one is viewed
                        if (preloadUrls.length > 0) {
                            preload(preloadUrls);
                        }
                    } else {
                        // Rule 14: Memory Disposal
                        // Nullify src when out of view to allow GC for high-res assets
                        setIsInView(false);
                        setImageSrc(undefined);
                        setIsLoaded(false);
                    }
                });
            },
            {
                rootMargin: isInView ? '200px' : rootMargin, // Wider margin once loaded to prevent jitter
                threshold: 0.01
            }
        );

        observer.observe(containerElement);
        return () => {
            observer.disconnect();
            // Cleanup blob URLs if they were generated/consumed
            // Note: We only revoke if it's a blob and we likely 'own' it for this view
            if (imageSrc?.startsWith('blob:')) {
                revokeBlob(imageSrc);
            }
        };
    }, [src, rootMargin, isInView, imageSrc, preloadUrls, preload]);


    const handleLoad = () => {
        setIsLoaded(true);
        if (onLoad) onLoad();
    };

    const handleLowResLoad = () => {
        setLowResLoaded(true);
    };

    const handleError = () => {
        setHasError(true);
        if (fallbackSrc && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(false);
        } else if (onError) {
            onError();
        }
    };

    const renderPlaceholder = () => {
        if (placeholder === 'none' || (isLoaded && !lowResSrc) || (isLoaded && lowResLoaded)) {
            return null;
        }

        if (typeof placeholder === 'object' && placeholder !== null) {
            return placeholder;
        }

        // Show blurred low-res image if available and high-res hasn't loaded
        if (lowResSrc && !isLoaded) {
            return (
                <img
                    src={lowResSrc}
                    alt={alt}
                    className={`absolute inset-0 w-full h-full object-cover blur-lg transition-opacity duration-500 ${lowResLoaded ? 'opacity-100' : 'opacity-0'
                        } ${className}`}
                    onLoad={handleLowResLoad}
                />
            );
        }

        if (placeholder === 'blur') {
            return <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />;
        }

        return (
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                </svg>
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className={`relative ${overflowVisible ? '' : 'overflow-hidden'} ${containerClassName}`} // Ref stays on container for IntersectionObserver
            style={{ minHeight: imgProps.height ? `${imgProps.height}px` : '100%' }}
        >
            {renderPlaceholder()}

            {isInView && (
                <img
                    ref={ref} // Forward ref to IMG
                    src={imageSrc}
                    alt={alt}
                    className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={style}
                    {...imgProps}
                />
            )}

            {children}

            {hasError && !fallbackSrc && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <div className="text-center p-2">
                        <svg className="w-8 h-8 text-slate-400 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-[10px] text-slate-500">Failed</p>
                    </div>
                </div>
            )}
        </div>
    );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

