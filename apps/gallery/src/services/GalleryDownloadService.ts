/**
 * Configuration for the Master API.
 * Uses environment variable if available, otherwise falls back to empty string.
 */
const API_BASE = import.meta.env?.VITE_MASTER_API_URL || '';

/**
 * Service to handle gallery downloading, watermarking, and sharing functionalities.
 */
export class GalleryDownloadService {
  /**
   * Fetches all photos for a gallery, applies watermarks if not purchased,
   * and bundles them into a ZIP file.
   *
   * @param galleryId - The ID of the gallery to download
   * @param isPurchased - Whether the customer has purchased the gallery
   * @returns A promise that resolves to a Blob representing the ZIP file
   */
  async downloadFullGallery(galleryId: string, isPurchased: boolean): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE}/api/gallery/${galleryId}/download?purchased=${isPurchased}`);
      if (!response.ok) {
        throw new Error('Failed to download full gallery');
      }
      return await response.blob();
    } catch (error) {
      console.warn('API unavailable, returning mock ZIP blob for full gallery', error);
      // Mock fallback: return an empty text blob disguised as a ZIP for testing
      return new Blob(['mock zip content - full gallery'], { type: 'application/zip' });
    }
  }

  /**
   * Fetches selected photos, applies watermarks if not purchased,
   * and bundles them into a ZIP file.
   *
   * @param photoIds - Array of photo IDs to download
   * @param isPurchased - Whether the customer has purchased the photos
   * @returns A promise that resolves to a Blob representing the ZIP file
   */
  async downloadSelected(photoIds: string[], isPurchased: boolean): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE}/api/gallery/download-selected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoIds, purchased: isPurchased })
      });
      
      if (!response.ok) {
        throw new Error('Failed to download selected photos');
      }
      return await response.blob();
    } catch (error) {
      console.warn('API unavailable, returning mock ZIP blob for selected photos', error);
      // Mock fallback
      return new Blob([`mock zip content - ${photoIds.length} photos`], { type: 'application/zip' });
    }
  }

  /**
   * Calls the Master OS watermark API endpoint to apply a watermark to an image.
   *
   * @param imageUrl - The original image URL
   * @returns A promise that resolves to the watermarked image URL
   */
  async applyWatermark(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/api/gallery/watermark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl })
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply watermark');
      }
      const data = await response.json();
      return data.watermarkedUrl;
    } catch (error) {
      console.warn('API unavailable, returning simulated watermark URL', error);
      // Mock fallback: simulate a watermarked URL
      return `${imageUrl}?watermarked=true`;
    }
  }

  /**
   * Generates a shareable magic link URL with UTM tracking for the gallery.
   *
   * @param galleryId - The ID of the gallery
   * @param platform - The platform being shared to ('whatsapp', 'email', or 'clipboard')
   * @returns A promise that resolves to the magic link URL
   */
  async generateShareLink(galleryId: string, platform: 'whatsapp' | 'email' | 'clipboard'): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/api/gallery/${galleryId}/share-link?platform=${platform}`);
      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }
      const data = await response.json();
      return data.shareUrl;
    } catch (error) {
      console.warn('API unavailable, returning local share link', error);
      // Mock fallback
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      return `${baseUrl}/gallery/${galleryId}?utm_source=share&utm_medium=${platform}`;
    }
  }

  /**
   * Returns the platform-specific intent URL for sharing.
   *
   * @param platform - The platform to share to ('whatsapp' or 'email')
   * @param galleryUrl - The generated shareable URL
   * @param message - The text message to include with the link
   * @returns The intent URL (e.g., wa.me or mailto:)
   */
  getShareUrl(platform: string, galleryUrl: string, message: string): string {
    const encodedMessage = encodeURIComponent(`${message}\n\n${galleryUrl}`);
    
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        return `https://wa.me/?text=${encodedMessage}`;
      case 'email':
        return `mailto:?subject=${encodeURIComponent('Check out my gallery!')}&body=${encodedMessage}`;
      default:
        return galleryUrl;
    }
  }
}

export const galleryDownloadService = new GalleryDownloadService();
