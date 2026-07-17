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
      const url = `${baseUrl}/api/gallery-auth/order-login`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: normalizedPin, customerEmail: normalizedEmail })
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 401) {
          return null;
        }
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success || !data.order) {
        return null;
      }

      // Store JWT token for subsequent requests
      if (data.token) {
        localStorage.setItem("gallery_token", data.token);
      }

      const order = data.order;
      const formattedOrder: Order = {
        id: order.id,
        date: order.date || new Date().toISOString(),
        clientName: order.clientName,
        email: order.email,
        status: order.status,
        total: order.total,
        photographerId: order.photographerId,
        destinationId: order.destinationId,
        appliedDiscount: order.appliedDiscount || 0,
        albumId: order.albumId,
        items: Array.isArray(order.items) ? order.items : [],
      };

      return formattedOrder;
    } catch (err) {
      logger.warn("[Cloud API] Order lookup failed", err);
      return null;
    }
  },

  /**
   * Fetches an order via secure Magic Link Token or Stored JWT Token
   */
  async getOrderByToken(token: string): Promise<Order | null> {
    try {
      const normalizedToken = token.trim();
      const baseUrl = config.apiUrl;
      const url = `${baseUrl}/api/gallery-auth/token-verify`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: normalizedToken }),
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 401) return null;
        throw new Error(`Failed to verify token: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success || !data.order) return null;

      // Ensure we store it locally so it can be reused across reloads
      localStorage.setItem("gallery_token", data.token || normalizedToken);

      const order = data.order;
      const formattedOrder: Order = {
        id: order.id,
        date: order.date || new Date().toISOString(),
        clientName: order.clientName,
        email: order.email,
        status: order.status,
        total: order.total,
        photographerId: order.photographerId,
        destinationId: order.destinationId,
        appliedDiscount: order.appliedDiscount || 0,
        albumId: order.albumId,
        items: Array.isArray(order.items) ? order.items : [],
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
};
