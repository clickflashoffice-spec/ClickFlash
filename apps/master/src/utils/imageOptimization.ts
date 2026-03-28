/**
 * Image Optimization Utilities
 * Handles lazy loading, responsive images, and format optimization
 */

/**
 * Generate responsive image srcset
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  // If URL already has query params, append to them
  const separator = baseUrl.includes('?') ? '&' : '?';
  
  return widths
    .map((width) => `${baseUrl}${separator}w=${width} ${width}w`)
    .join(', ');
}

/**
 * Get optimal image size for viewport
 */
export function getOptimalImageWidth(
  containerWidth: number,
  devicePixelRatio: number = window.devicePixelRatio || 1
): number {
  const optimalWidth = containerWidth * devicePixelRatio;
  
  // Common breakpoints
  const breakpoints = [320, 640, 960, 1280, 1920, 2560];
  
  // Find smallest breakpoint that covers the optimal width
  for (const bp of breakpoints) {
    if (bp >= optimalWidth) {
      return bp;
    }
  }
  
  return breakpoints[breakpoints.length - 1];
}

/**
 * Lazy load image with Intersection Observer
 */
export function lazyLoadImage(
  imgElement: HTMLImageElement,
  src: string,
  placeholderSrc?: string
): void {
  // Set placeholder while loading
  if (placeholderSrc) {
    imgElement.src = placeholderSrc;
  }
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = src;
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading 50px before visible
      threshold: 0.01,
    });
    
    observer.observe(imgElement);
  } else {
    // Fallback for browsers without IntersectionObserver
    imgElement.src = src;
  }
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload multiple images
 */
export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * Get WebP version of image if supported
 */
export async function getOptimizedImageUrl(
  originalUrl: string
): Promise<string> {
  // Check WebP support
  const supportsWebP = document.createElement('canvas')
    .toDataURL('image/webp')
    .indexOf('data:image/webp') === 0;
  
  if (!supportsWebP) {
    return originalUrl;
  }
  
  // Try to get WebP version by adding format parameter
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}format=webp`;
}

/**
 * Compress image before upload
 */
export function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    type?: string;
  } = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.8,
      type = 'image/jpeg',
    } = options;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not create blob'));
            }
          },
          type,
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create a blurred placeholder from image
 */
export function createBlurPlaceholder(
  imageUrl: string,
  width: number = 20
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const aspectRatio = img.height / img.width;
      canvas.width = width;
      canvas.height = width * aspectRatio;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Use low quality for blur effect
      ctx.filter = 'blur(10px)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.1));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * React hook for lazy loading images
 */
export function useLazyImage(src: string, placeholderSrc?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholderSrc || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);
  
  React.useEffect(() => {
    if (!imgRef.current) return;
    
    lazyLoadImage(imgRef.current, src, placeholderSrc);
    
    const img = imgRef.current;
    const handleLoad = () => setIsLoaded(true);
    img.addEventListener('load', handleLoad);
    
    return () => {
      img.removeEventListener('load', handleLoad);
    };
  }, [src, placeholderSrc]);
  
  return { imgRef, imageSrc, isLoaded };
}

// React import for the hook
import React from 'react';
