/**
 * API Service for Cloud-Based Portals (Customer & Management)
 *
 * Connects to the PocketBase backend ("The Cloud") to fetch real data.
 */


import { Order } from "../types.ts";

type LocalStorageOrder = Order & { access_pin?: string; roomNumber?: string };

export const cloudApiService = {
  async getOrderByCredentials(
    pin: string,
    email: string,
  ): Promise<Order | null> {
    try {
      const normalizedPin = pin.trim();
      const normalizedEmail = email.trim().toLowerCase();

      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
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
        items: Array.isArray(order.items) ? order.items : [],
      };

      return formattedOrder;
    } catch (err) {
      console.warn("[Cloud API] Order lookup failed", err);
      return null;
    }
  },

  /**
   * Fetches an order via secure Magic Link Token or Stored JWT Token
   */
  async getOrderByToken(token: string): Promise<Order | null> {
    try {
      const normalizedToken = token.trim();
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
      const url = `${baseUrl}/api/gallery-auth/${encodeURIComponent(normalizedToken)}/verify`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 401) return null;
        throw new Error(`Failed to verify token: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success || !data.order) return null;

      // Ensure we store it locally so it can be reused across reloads
      localStorage.setItem("gallery_token", normalizedToken);

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
        items: Array.isArray(order.items) ? order.items : [],
      };

      return formattedOrder;
    } catch (err) {
      console.warn("[Cloud API] Order lookup by token failed", err);
      return null;
    }
  },

  /**
   * Fetches an order by room number (for QR-based login)
   */
  async getOrderByRoomNumber(roomNumber: string): Promise<Order | null> {
    try {
      const normalizedRoomNumber = roomNumber.trim();

      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
      const url = `${baseUrl}/api/orders/by-room?roomNumber=${encodeURIComponent(normalizedRoomNumber)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(
          `Failed to fetch order by room: ${response.statusText}`,
        );
      }

      const order = await response.json();

      if (!order) {
        return null;
      }

      const formattedOrder: Order = {
        id: order.id,
        date: order.date,
        clientName: order.clientName,
        email: order.email,
        status: order.status,
        total: order.total,
        photographerId: order.photographerId,
        destinationId: order.destinationId,
        appliedDiscount: order.appliedDiscount || 0,
        items: Array.isArray(order.items) ? order.items : [],
      };

      return formattedOrder;
    } catch (err) {
      console.warn("[Cloud API] Order lookup by room failed", err);
      return null;
    }
  },

  /**
   * Creates an order in the cloud API.
   */
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
      const url = `${baseUrl}/api/orders`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const newOrder = await response.json();
      return newOrder;
    } catch (err) {
      console.warn("[Cloud API] Create order failed, returning mock", err);
      // Fallback to mock for development if cloud api isn't ready
      return {
          id: `ORDER-${Date.now()}`,
          date: new Date().toISOString(),
          clientName: orderData.clientName || '',
          email: orderData.email || '',
          status: 'Pending',
          total: orderData.total || 0,
          photographerId: orderData.photographerId || 0,
          destinationId: orderData.destinationId || '',
          appliedDiscount: orderData.appliedDiscount || 0,
          items: orderData.items || []
      };
    }
  },
};
