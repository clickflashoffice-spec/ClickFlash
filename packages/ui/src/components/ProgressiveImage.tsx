'use client';
import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { decode } from 'blurhash';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  blurhash?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  canvasClassName?: string;
  blurhashWidth?: number;
  blurhashHeight?: number;
  priority?: boolean;
}

export const ProgressiveImage = memo<ProgressiveImageProps>(({
  src,
  blurhash,
  alt,
  className,
  imageClassName,
  canvasClassName,
  blurhashWidth = 32,
  blurhashHeight = 32,
  priority = false,
  style,
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset loading status when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  // Decode blurhash to canvas
  useEffect(() => {
    if (!blurhash || isLoaded || hasError) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const pixels = decode(blurhash, blurhashWidth, blurhashHeight);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(blurhashWidth, blurhashHeight);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch (e) {
      // Ignore decode error for invalid/corrupted blurhash string
    }
  }, [blurhash, blurhashWidth, blurhashHeight, isLoaded, hasError]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e);
    }
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div
      className={twMerge(clsx('relative overflow-hidden bg-slate-900/50 dark:bg-slate-900', className))}
      style={style}
    >
      {/* Blurhash Canvas Placeholder */}
      {blurhash && !isLoaded && !hasError && (
        <canvas
          ref={canvasRef}
          width={blurhashWidth}
          height={blurhashHeight}
          className={twMerge(clsx(
            'absolute inset-0 w-full h-full object-cover origin-center transition-opacity duration-500 ease-out pointer-events-none select-none',
            isLoaded ? 'opacity-0' : 'opacity-100',
            canvasClassName
          ))}
        />
      )}

      {/* Fallback Pulse Skeleton if no blurhash while loading */}
      {!blurhash && !isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-slate-800/60 pointer-events-none select-none" />
      )}

      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={priority ? 'eager' : 'lazy'}
        className={twMerge(clsx(
          'w-full h-full object-cover origin-center transition-opacity duration-500 ease-out',
          isLoaded ? 'opacity-100' : 'opacity-0',
          imageClassName
        ))}
        {...props}
      />
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';
export default ProgressiveImage;
