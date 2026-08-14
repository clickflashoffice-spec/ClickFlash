import { logger } from '@clickflash/logger';
/**
 * Metadata Utilities
 * 
 * Helper functions for extracting and displaying photo metadata/EXIF data.
 */

import { PhotoMetadata } from '../types';

/**
 * Extract metadata from an image file
 */
export const extractMetadata = async (imageUrl: string): Promise<PhotoMetadata | null> => {
    try {
        // Load image to get dimensions
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        return new Promise((resolve) => {
            img.onload = () => {
                const metadata: PhotoMetadata = {
                    dimensions: {
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                    },
                };
                resolve(metadata);
            };
            
            img.onerror = () => {
                resolve(null);
            };
            
            img.src = imageUrl;
        });
    } catch (error) {
        logger.error('Error extracting metadata:', error);
        return null;
    }
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format date in readable format
 */
export const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (error) {
        return dateString;
    }
};

/**
 * Get image file size from URL (if possible)
 */
export const getImageFileSize = async (imageUrl: string): Promise<number | null> => {
    try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : null;
    } catch (error) {
        logger.error('Error getting file size:', error);
        return null;
    }
};

/**
 * Format metadata for display
 */
export const formatMetadataForDisplay = (metadata: PhotoMetadata | undefined): string[] => {
    if (!metadata) return [];
    
    const lines: string[] = [];
    
    if (metadata.camera) {
        lines.push(`Camera: ${metadata.camera}`);
    }
    
    if (metadata.lens) {
        lines.push(`Lens: ${metadata.lens}`);
    }
    
    if (metadata.iso) {
        lines.push(`ISO: ${metadata.iso}`);
    }
    
    if (metadata.aperture) {
        lines.push(`Aperture: f/${metadata.aperture}`);
    }
    
    if (metadata.shutterSpeed) {
        lines.push(`Shutter Speed: ${metadata.shutterSpeed}`);
    }
    
    if (metadata.focalLength) {
        lines.push(`Focal Length: ${metadata.focalLength}mm`);
    }
    
    if (metadata.dimensions) {
        lines.push(`Dimensions: ${metadata.dimensions.width} × ${metadata.dimensions.height}`);
    }
    
    if (metadata.fileSize) {
        lines.push(`File Size: ${formatFileSize(metadata.fileSize)}`);
    }
    
    if (metadata.dateTaken) {
        lines.push(`Date Taken: ${formatDate(metadata.dateTaken)}`);
    }
    
    return lines;
};

