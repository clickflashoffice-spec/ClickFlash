/**
 * API Service for Cloud-Based Portals (Customer & Management)
 *
 * Connects to the PocketBase backend ("The Cloud") to fetch real data.
 */


import { Order } from "../types.ts";

type LocalStorageOrder = Order & { access_pin?: string; roomNumber?: string };

export const cloudApiService = {
  /**
   * Fetches an order by credentials from the backend API.
   */
  async getOrderByCredentials(
    pin: string,
    email: string,
  ): Promise<Order | null> {
    try {
      // Normalize inputs: trim whitespace and lowercase email
      const normalizedPin = pin.trim();
      const normalizedEmail = email.trim().toLowerCase();

      // Use the backend API endpoint for order lookup
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
      const url = `${baseUrl}/api/orders/by-credentials?pin=${encodeURIComponent(normalizedPin)}&email=${encodeURIComponent(normalizedEmail)}`;

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
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const order = await response.json();

      if (!order) {
        return null;
      }

      // Ensure items are properly formatted
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
      console.warn("[Cloud API] Order lookup failed", err);
      return null;
    }
  },

  /**
   * Fetches an order via secure Magic Link Token
   */
  async getOrderByToken(token: string): Promise<Order | null> {
    try {
      const normalizedToken = token.trim();
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8090";
      const url = `${baseUrl}/api/orders/by-token?token=${encodeURIComponent(normalizedToken)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const order = await response.json();
      if (!order) return null;

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
