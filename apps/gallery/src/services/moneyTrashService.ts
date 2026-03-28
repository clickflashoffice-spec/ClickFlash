/**
 * Money Trash Service for Customer Gallery
 * Enables customers to browse and purchase archived/unsold photos at discount
 */

import { Photo } from "../types";

interface MoneyTrashPhoto extends Photo {
  originalAlbumId: string;
  archivedAt: string;
  discountPercentage: number;
  discountPrice: number;
  originalPrice: number;
  daysUntilDeletion: number;
  isFromMoneyTrash: true;
}

interface TrashGallery {
  id: string;
  eventName: string;
  eventDate: string;
  photos: MoneyTrashPhoto[];
  totalPhotos: number;
  expiresAt: string;
  discountPercentage: number;
}

class MoneyTrashService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.VITE_API_URL ||
      "https://management-hub.clickflash-office.workers.dev";
  }

  /**
   * Get archived photos for a customer by access code/room number
   */
  async getArchivedPhotos(accessCode: string): Promise<TrashGallery | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/moneytrash/gallery/${accessCode}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch archived photos");
      }

      const data = await response.json();
      return this.transformTrashGallery(data);
    } catch (error) {
      console.error("MoneyTrash fetch error:", error);
      return null;
    }
  }

  /**
   * Transform API response to TrashGallery format
   */
  private transformTrashGallery(data: any): TrashGallery {
    return {
      id: data.id,
      eventName: data.eventName,
      eventDate: data.eventDate,
      totalPhotos: data.photos?.length || 0,
      expiresAt: data.expiresAt,
      discountPercentage: data.discountPercentage || 50,
      photos: (data.photos || []).map((p: any) => ({
        ...p,
        isFromMoneyTrash: true,
        originalAlbumId: p.albumId,
        archivedAt: p.archivedAt,
        discountPercentage:
          p.discountPercentage || data.discountPercentage || 50,
        originalPrice: p.originalPrice || 15,
        discountPrice: this.calculateDiscountPrice(
          p.originalPrice || 15,
          p.discountPercentage || data.discountPercentage || 50,
        ),
        daysUntilDeletion: this.calculateDaysUntilDeletion(
          p.expiresAt || data.expiresAt,
        ),
      })),
    };
  }

  /**
   * Calculate discounted price
   */
  private calculateDiscountPrice(
    originalPrice: number,
    discountPercentage: number,
  ): number {
    return (
      Math.round(originalPrice * (1 - discountPercentage / 100) * 100) / 100
    );
  }

  /**
   * Calculate days until photo is permanently deleted
   */
  private calculateDaysUntilDeletion(expiresAt: string): number {
    const expiration = new Date(expiresAt);
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Recover a photo from trash to customer's active gallery
   * Called when customer purchases an archived photo
   */
  async recoverPhoto(photoId: string, orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/moneytrash/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, orderId }),
      });

      return response.ok;
    } catch (error) {
      console.error("Photo recovery failed:", error);
      return false;
    }
  }

  /**
   * Get recovery statistics for a gallery
   */
  async getRecoveryStats(accessCode: string): Promise<{
    totalArchived: number;
    totalRecovered: number;
    totalExpired: number;
    revenueFromTrash: number;
  } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/moneytrash/stats/${accessCode}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch trash stats:", error);
      return null;
    }
  }

  /**
   * Check if a gallery has archived photos available
   */
  async hasArchivedPhotos(accessCode: string): Promise<boolean> {
    const gallery = await this.getArchivedPhotos(accessCode);
    return gallery !== null && gallery.photos.length > 0;
  }
}

// Export singleton
export const moneyTrashService = new MoneyTrashService();
export type { MoneyTrashPhoto, TrashGallery };
