import { logger } from '@clickflash/logger';
/**
 * Money Trash Service for Customer Gallery
 * Enables customers to browse and purchase archived/unsold photos at discount
 */

import { Photo } from "../types";
import { config } from "../utils/env";

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
  accessCode: string;
  purchaseToken: string;
  purchaseTokenExpiresAt: string;
  eventName: string;
  eventDate: string;
  photos: MoneyTrashPhoto[];
  totalPhotos: number;
  expiresAt: string;
  discountPercentage: number;
  singlePhotoPrice: number;
}

interface MoneyTrashCheckoutResult {
  orderId: string;
  sessionId: string;
  url: string;
  amount: number;
  currency: string;
}

interface MoneyTrashCheckoutStatus {
  orderId: string;
  status: string;
  paid: boolean;
  amount: number;
  currency: string;
  downloads: MoneyTrashPurchaseDownload[];
}

interface MoneyTrashPurchaseDownload {
  photoId: string;
  filename: string;
  url: string;
  expiresAt: string;
}

const ACCESS_CODE_SESSION_KEY = "clickflash_moneytrash_access_code";
const CHECKOUT_SESSION_KEY = "clickflash_moneytrash_checkout";
const STRIPE_SESSION_KEY = "clickflash_moneytrash_stripe_session";

class MoneyTrashService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.moneyTrashApiUrl;
  }

  /**
   * Get archived photos for a customer by access code/room number
   */
  async getArchivedPhotos(accessCode: string): Promise<TrashGallery | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/galleries/${encodeURIComponent(accessCode.trim())}`,
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch archived photos");
      }

      const data = await response.json();
      return this.transformTrashGallery(data.gallery || data, accessCode.trim());
    } catch (error) {
      logger.error("MoneyTrash fetch error:", error);
      throw error;
    }
  }

  /**
   * Transform API response to TrashGallery format
   */
  private transformTrashGallery(data: any, requestedAccessCode: string): TrashGallery {
    const singlePhotoPrice = Number(data.settings?.singlePhotoPrice ?? 0);
    return {
      id: data.id,
      accessCode: data.accessCode || requestedAccessCode,
      purchaseToken: data.purchaseToken,
      purchaseTokenExpiresAt: data.purchaseTokenExpiresAt,
      eventName: data.name || "ClickFlash Event Gallery",
      eventDate: data.createdAt,
      totalPhotos: data.assets?.length || 0,
      expiresAt: data.expiresAt,
      discountPercentage: 0,
      singlePhotoPrice,
      photos: (data.assets || []).map((p: any) => ({
        ...p,
        isFromMoneyTrash: true,
        albumId: data.id,
        originalAlbumId: data.id,
        photographerId: data.officeId || "moneytrash",
        archivedAt: p.createdAt,
        discountPercentage: 0,
        originalPrice: Number(p.originalPrice ?? p.price ?? singlePhotoPrice),
        discountPrice: this.calculateDiscountPrice(
          Number(p.originalPrice ?? p.price ?? singlePhotoPrice),
          0,
        ),
        daysUntilDeletion: this.calculateDaysUntilDeletion(
          data.expiresAt,
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
    if (Number.isNaN(expiration.getTime())) return 0;
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Check if a gallery has archived photos available
   */
  async hasArchivedPhotos(accessCode: string): Promise<boolean> {
    const gallery = await this.getArchivedPhotos(accessCode);
    return gallery !== null && gallery.photos.length > 0;
  }

  rememberAccessCode(accessCode: string): void {
    sessionStorage.setItem(ACCESS_CODE_SESSION_KEY, accessCode.trim());
  }

  getRememberedAccessCode(): string | null {
    return sessionStorage.getItem(ACCESS_CODE_SESSION_KEY);
  }

  clearRememberedAccessCode(): void {
    sessionStorage.removeItem(ACCESS_CODE_SESSION_KEY);
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
    sessionStorage.removeItem(STRIPE_SESSION_KEY);
  }

  getOrCreateCheckoutSessionId(galleryId: string, photoIds: string[]): string {
    const fingerprint = [...new Set(photoIds)].sort().join("|");
    try {
      const stored = JSON.parse(sessionStorage.getItem(CHECKOUT_SESSION_KEY) || "null") as {
        galleryId?: string;
        fingerprint?: string;
        sessionId?: string;
      } | null;
      if (
        stored?.galleryId === galleryId &&
        stored.fingerprint === fingerprint &&
        typeof stored.sessionId === "string" &&
        /^[0-9a-f-]{36}$/i.test(stored.sessionId)
      ) {
        return stored.sessionId;
      }
    } catch {
      sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
    }

    const sessionId = crypto.randomUUID();
    sessionStorage.setItem(
      CHECKOUT_SESSION_KEY,
      JSON.stringify({ galleryId, fingerprint, sessionId }),
    );
    return sessionId;
  }

  clearCheckoutSession(): void {
    sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
  }

  async createCheckout(
    purchaseToken: string,
    galleryId: string,
    photoIds: string[],
  ): Promise<MoneyTrashCheckoutResult> {
    const response = await fetch(`${this.baseUrl}/api/gallery-checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${purchaseToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [...new Set(photoIds)].map((photoId) => ({ photoId })),
        cartSessionId: this.getOrCreateCheckoutSessionId(galleryId, photoIds),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      throw new Error(data.error || `Checkout failed (${response.status})`);
    }
    const checkout = data as MoneyTrashCheckoutResult;
    sessionStorage.setItem(STRIPE_SESSION_KEY, checkout.sessionId);
    return checkout;
  }

  async getCheckoutStatus(
    purchaseToken: string,
    sessionId: string,
  ): Promise<MoneyTrashCheckoutStatus> {
    const response = await fetch(
      `${this.baseUrl}/api/gallery-checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${purchaseToken}` } },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Checkout status failed (${response.status})`);
    }
    return {
      ...(data as MoneyTrashCheckoutStatus),
      downloads: Array.isArray(data.downloads) ? data.downloads : [],
    };
  }

  getRememberedStripeSession(): string | null {
    const value = sessionStorage.getItem(STRIPE_SESSION_KEY);
    return value && /^cs_[A-Za-z0-9_]+$/.test(value) ? value : null;
  }

  clearRememberedStripeSession(): void {
    sessionStorage.removeItem(STRIPE_SESSION_KEY);
  }
}

// Export singleton
export const moneyTrashService = new MoneyTrashService();
export type {
  MoneyTrashCheckoutResult,
  MoneyTrashCheckoutStatus,
  MoneyTrashPurchaseDownload,
  MoneyTrashPhoto,
  TrashGallery,
};
