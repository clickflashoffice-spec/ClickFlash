/**
 * API Service for Cloud-Based Portals (Customer & Management)
 *
 * Connects to the PocketBase backend ("The Cloud") to fetch real data.
 */

import { apiService as localApiService } from "./apiService";
import { Order } from "../types.ts";
import { pb } from "./pb";

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
      const baseUrl = pb.baseUrlValue || "http://127.0.0.1:8090";
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
      console.warn(
        "[Cloud API] Order lookup failed, trying local fallback...",
        err,
      );

      // Fallback to Local Storage (for Demo/Offline consistency)
      try {
        const orders = await localApiService.getOrders();
        const order = orders.find(
          (o) => o.access_pin === pin && o.email === email,
        );
        return order || null;
      } catch (fallbackErr) {
        console.warn("[Cloud API] Local fallback also failed", fallbackErr);
        return null;
      }
    }
  },

  /**
   * Fetches an order via secure Magic Link Token
   */
  async getOrderByToken(token: string): Promise<Order | null> {
    try {
      const normalizedToken = token.trim();
      const baseUrl = pb.baseUrlValue || "http://127.0.0.1:8090";
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

      const baseUrl = pb.baseUrlValue || "http://127.0.0.1:8090";
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
      console.warn(
        "[Cloud API] Order lookup by room failed, trying local fallback...",
        err,
      );

      // Fallback to Local Storage
      try {
        const orders = await localApiService.getOrders();
        const order = orders.find((o) => o.roomNumber === roomNumber);
        return order || null;
      } catch (fallbackErr) {
        console.warn("[Cloud API] Local fallback also failed", fallbackErr);
        return null;
      }
    }
  },

  // --- Management Portal Functions ---
  // In a full deployment, these would also query PocketBase collections.
  // For this version, we keep them linked to the localApiService to ensure
  // the Management Portal works seamlessly with the local demo data.

  async getOrders() {
    return localApiService.getOrders();
  },

  async getExpenses() {
    return localApiService.getExpenses();
  },

  async getUsers() {
    return localApiService.getUsers();
  },

  async getDestinations() {
    return localApiService.getDestinations();
  },

  async getLoans() {
    return localApiService.getLoans();
  },

  async getAdjustments() {
    return localApiService.getAdjustments();
  },

  /**
   * Login user using the API endpoint (works for both local and cloud)
   */
  async loginUser(email: string, password: string) {
    return localApiService.loginUser(email, password);
  },
};
