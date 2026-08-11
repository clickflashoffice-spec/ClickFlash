import { logger } from '@clickflash/logger';
/**
 * API Service for Cloud-Based Portals (Customer & Management)
 *
 * Connects to the Cloudflare Worker API backed by D1 and R2.
 */


import { Order, Product } from "../types.ts";
import { config } from "../utils/env";

export const cloudApiService = {
  async getOrderByCredentials(
    pin: string,
    email: string,
  ): Promise<Order | null> {
    try {
      const normalizedPin = pin.trim();
      const normalizedEmail = email.trim().toLowerCase();

      const baseUrl = config.apiUrl;
      // Use the new login endpoint
      const url = `${baseUrl}/api/gallery-auth/login`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessCode: normalizedPin })
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 401) {
          return null;
        }
        throw new Error(`Failed to authenticate: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.token) {
        return null;
      }

      // Store JWT token for subsequent requests
      localStorage.setItem("gallery_token", data.token);

      // Now fetch the photos
      const photosResponse = await fetch(`${baseUrl}/api/photos`, {
        headers: { Authorization: `Bearer ${data.token}` }
      });

      if (!photosResponse.ok) {
         throw new Error(`Failed to fetch photos: ${photosResponse.statusText}`);
      }

      const photosData = await photosResponse.json();
      const photos = photosData.photos || [];

      // Construct an Order structure to satisfy the frontend expectations
      const event = data.event;
      const formattedOrder: Order = {
        id: event?.id || normalizedPin,
        date: event?.date || new Date().toISOString(),
        clientName: normalizedEmail, // Use email as client name placeholder
        email: normalizedEmail,
        status: 'Completed',
        total: 0,
        photographerId: event?.photographer_id || 'system',
        items: photos.map((photo: any) => ({
          id: `item-${photo.id}`,
          name: 'Digital Photo',
          quantity: 1,
          price: 0,
          photo: {
             ...photo,
             // The backend sends aiTags, the frontend component expects aiTags
             aiTags: photo.aiTags,
          }
        })) as any[],
      };

      return formattedOrder;
    } catch (err) {
      logger.warn("[Cloud API] Order lookup failed", err);
      return null;
    }
  },

  /**
   * Fetches an order via secure Magic Link Token, QR Code Token, or Stored JWT Token
   */
  async getOrderByToken(token: string): Promise<Order | null> {
    try {
      let normalizedToken = token.trim();
      const baseUrl = config.apiUrl;

      // 1. Check if token is a dynamic QR token by exchanging via /api/qr/validate
      try {
        const qrResponse = await fetch(`${baseUrl}/api/qr/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: normalizedToken })
        });
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          if (qrData.success && qrData.token) {
            normalizedToken = qrData.token;
          }
        }
      } catch (qrErr) {
        // Not a valid QR token or backend unreachable, proceed treating as JWT
      }

      // Ensure we store it locally so it can be reused across reloads
      localStorage.setItem("gallery_token", normalizedToken);

      // Since the token is a JWT, we can just fetch the photos
      const photosResponse = await fetch(`${baseUrl}/api/photos`, {
        headers: { Authorization: `Bearer ${normalizedToken}` }
      });

      if (!photosResponse.ok) {
         if (photosResponse.status === 404 || photosResponse.status === 401) return null;
         throw new Error(`Failed to fetch photos: ${photosResponse.statusText}`);
      }

      const photosData = await photosResponse.json();
      const photos = photosData.photos || [];

      // Decode token to get event info
      let tokenPayload: any = {};
      try {
        tokenPayload = JSON.parse(atob(normalizedToken));
      } catch (e) {
        // Ignore decode error
      }

      const formattedOrder: Order = {
        id: tokenPayload?.eventId || 'unknown',
        date: new Date().toISOString(),
        clientName: 'Guest',
        email: '',
        status: 'Completed',
        total: 0,
        photographerId: 'system',
        items: photos.map((photo: any) => ({
          id: `item-${photo.id}`,
          name: 'Digital Photo',
          quantity: 1,
          price: 0,
          photo: {
             ...photo,
             aiTags: photo.aiTags,
          }
        })) as any[],
      };

      return formattedOrder;
    } catch (err) {
      logger.warn("[Cloud API] Order lookup by token failed", err);
      return null;
    }
  },

  async getPhotoDownloadUrl(photoId: string): Promise<string> {
    const token = localStorage.getItem("gallery_token");
    if (!token) throw new Error("Customer authentication is required");

    const baseUrl = config.apiUrl;
    const response = await fetch(
      `${baseUrl}/api/photos/${encodeURIComponent(photoId)}/download-url`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!response.ok) {
      throw new Error(`Download authorization failed (${response.status})`);
    }

    const data = await response.json();
    if (!data.downloadUrl) throw new Error("Download URL was not returned");
    return data.downloadUrl;
  },

  async updateProofingStatus(
    orderId: string,
    photoId: string,
    status: "approved" | "rejected" | "pending",
  ): Promise<void> {
    const token = localStorage.getItem("gallery_token");
    if (!token) throw new Error("Customer authentication is required");

    const response = await fetch(
      `${config.apiUrl}/api/gallery/orders/${encodeURIComponent(orderId)}/photos/${encodeURIComponent(photoId)}/proofing`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );

    if (!response.ok) {
      throw new Error(`Proofing update failed (${response.status})`);
    }
  },

  async getCheckoutStatus(sessionId: string): Promise<{ paid: boolean; status: string; orderId: string }> {
    const token = localStorage.getItem("gallery_token");
    if (!token) throw new Error("Customer authentication is required");

    const response = await fetch(
      `${config.apiUrl}/api/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error(`Checkout status failed (${response.status})`);

    const data = await response.json();
    return {
      paid: Boolean(data.paid),
      status: String(data.status || "pending"),
      orderId: String(data.orderId || ""),
    };
  },

  async getProducts(): Promise<Product[]> {
    const response = await fetch(`${config.apiUrl}/api/gallery/products`);
    if (!response.ok) throw new Error(`Product catalog failed (${response.status})`);

    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
  },

  async notifyCashPending(items: any[]): Promise<{ orderId: string, status: string }> {
    const token = localStorage.getItem("gallery_token");
    if (!token) throw new Error("Customer authentication is required");

    const response = await fetch(`${config.apiUrl}/api/gallery-checkout/${encodeURIComponent(token)}/cash`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
    });

    if (!response.ok) {
        throw new Error(`Failed to notify cash payment (${response.status})`);
    }
    return response.json();
  },

  async getResortBranding(destinationId: string): Promise<any> {
    try {
      const response = await fetch(`${config.apiUrl}/api/resorts/branding?destination_id=${encodeURIComponent(destinationId)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.branding || null;
    } catch (e) {
      logger.error("Failed to fetch resort branding", e);
      return null;
    }
  },

  async processMagicEraser(imageUrl: string, maskDataUrl: string): Promise<string> {
    const token = localStorage.getItem("gallery_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${config.apiUrl}/api/ai/magic-eraser`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageUrl, maskDataUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Magic Eraser failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.processedImageUrl || data.url || `${imageUrl}?magic=erased&timestamp=${Date.now()}`;
  },

  async searchPhotosByFace(imageDataUrl: string): Promise<any[]> {
    const token = localStorage.getItem("gallery_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${config.apiUrl}/api/ai/face-search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
      throw new Error(`Face search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.matches || [];
  },
};
