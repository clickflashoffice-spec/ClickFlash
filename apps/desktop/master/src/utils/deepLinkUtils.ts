/**
 * Deep Linking Utilities for ClickFlash
 * 
 * Provides URL generation and parsing for direct links to:
 * - Albums
 * - Specific photos within albums
 * - Gallery checkout pages
 */

/**
 * Generate a deep link URL for a photo within an album
 * 
 * @param baseUrl - The base URL of the application
 * @param albumId - The album ID
 * @param photoId - The photo ID (optional - if not provided, links to album)
 * @returns The deep link URL
 * 
 * @example
 * // Link to album
 * getDeepLinkUrl('https://app.clickflash.com', 'album-123')
 * // Returns: 'clickflash://album/album-123'
 * 
 * // Link to specific photo
 * getDeepLinkUrl('https://app.clickflash.com', 'album-123', 'photo-456')
 * // Returns: 'clickflash://album/album-123/photo/photo-456'
 */
export function getDeepLinkUrl(
    _baseUrl: string,
    albumId: string,
    photoId?: string
): string {
    if (photoId) {
        return `clickflash://album/${albumId}/photo/${photoId}`;
    }
    return `clickflash://album/${albumId}`;
}

/**
 * Generate a web URL for accessing an album or photo
 * 
 * @param baseUrl - The base URL of the web application
 * @param albumId - The album ID
 * @param photoId - The photo ID (optional)
 * @returns The web URL
 */
export function getWebUrl(
    baseUrl: string,
    albumId: string,
    photoId?: string
): string {
    const url = new URL(baseUrl);
    if (photoId) {
        url.pathname = `/albums/${albumId}/photo/${photoId}`;
    } else {
        url.pathname = `/albums/${albumId}`;
    }
    return url.toString();
}

/**
 * Generate a shareable link for customer gallery access
 * 
 * @param galleryBaseUrl - The gallery base URL
 * @param albumAccessCode - The album's access code
 * @param photoId - Specific photo to highlight (optional)
 * @returns The shareable gallery URL
 */
export function getGalleryShareUrl(
    galleryBaseUrl: string,
    albumAccessCode: string,
    photoId?: string
): string {
    const url = new URL(galleryBaseUrl);
    url.pathname = `/gallery/${albumAccessCode}`;
    if (photoId) {
        url.hash = `photo-${photoId}`;
    }
    return url.toString();
}

/**
 * Parse a deep link URL and extract the components
 * 
 * @param deepLinkUrl - The deep link URL to parse
 * @returns Parsed deep link components or null if invalid
 */
export function parseDeepLink(
    deepLinkUrl: string
): { albumId: string; photoId?: string } | null {
    try {
        const url = new URL(deepLinkUrl);
        
        // Handle clickflash:// protocol
        if (url.protocol === 'clickflash:') {
            const pathParts = url.pathname.split('/').filter(Boolean);
            if (pathParts[0] === 'album' && pathParts[1]) {
                return {
                    albumId: pathParts[1],
                    photoId: pathParts[2] === 'photo' ? pathParts[3] : undefined,
                };
            }
        }
        
        // Handle web URLs with hash-based routing
        if (url.hash) {
            const hashParts = url.hash.replace('#', '').split('/');
            if (hashParts[0] === 'album' && hashParts[1]) {
                return {
                    albumId: hashParts[1],
                    photoId: hashParts[2] === 'photo' ? hashParts[3] : undefined,
                };
            }
        }
        
        // Handle standard path-based URLs
        if (url.pathname) {
            const pathParts = url.pathname.split('/').filter(Boolean);
            const albumIndex = pathParts.indexOf('albums');
            if (albumIndex !== -1 && pathParts[albumIndex + 1]) {
                const photoIndex = pathParts.indexOf('photo');
                return {
                    albumId: pathParts[albumIndex + 1],
                    photoId: photoIndex !== -1 ? pathParts[photoIndex + 1] : undefined,
                };
            }
        }
        
        return null;
    } catch {
        return null;
    }
}

/**
 * Generate a short link for SMS/email marketing
 * Uses URL shortening service if configured
 */
export async function getShortLink(
    longUrl: string,
    shortenerService?: string
): Promise<string> {
    if (!shortenerService) {
        return longUrl;
    }
    
    try {
        const response = await fetch(shortenerService, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl }),
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.shortUrl || longUrl;
        }
    } catch {
        // Return long URL if shortener fails
    }
    
    return longUrl;
}

/**
 * Build shareable message with deep link
 * Includes fallback web URL for non-app users
 */
export function buildShareMessage(
    albumTitle: string,
    webUrl: string,
    shortUrl?: string
): string {
    const link = shortUrl || webUrl;
    return `Your photos from "${albumTitle}" are ready! View and purchase your images here: ${link}`;
}
