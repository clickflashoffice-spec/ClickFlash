/**
 * API Service for Cloud-Based Portals (Customer & Management)
 *
 * Connects to the PocketBase backend ("The Cloud") to fetch real data.
 */

import { apiService as localApiService } from "./apiService.ts";
import { Order, User } from "../types.ts";
import { pb } from "./pb.ts";
import type { PocketRecord } from "./pbTypes.ts";

export const cloudApiService = {
  /**
   * Fetches an order by credentials from the PocketBase backend.
   */
  async getOrderByCredentials(
    orderId: string,
    email: string,
  ): Promise<Order | null> {
    // Normalize inputs: trim whitespace and lowercase email
    const normalizedOrderId = orderId.trim();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 1. Try PocketBase (Realtime Engine)
      // Note: We filter by ID and Email for security
      // First try exact match with normalized email
      let record;
      try {
        record = await pb
          .collection("orders")
          .getFirstListItem(
            `id="${normalizedOrderId}" && email="${normalizedEmail}"`,
          );
      } catch (exactMatchError) {
        // If exact match fails, try to get by ID and filter email case-insensitively
        try {
          const orders = await pb.collection("orders").getList(1, 50, {
            filter: `id="${normalizedOrderId}"`,
          });
          record =
            orders.items.find(
              (o: PocketRecord) =>
                (o.email as string | undefined)?.toLowerCase() ===
                normalizedEmail,
            ) || null;
        } catch {
          throw exactMatchError; // Throw original error
        }
      }

      if (record) {
        return {
          id: record.id,
          clientName: record.clientName,
          email: record.email,
          total: record.total,
          status: record.status,
          items: record.itemsJSON || [], // Hydrate items from JSON field
          date: record.created.split(" ")[0], // YYYY-MM-DD
          photographerId: record.photographerId,
          destinationId: record.destinationId,
          appliedDiscount: 0,
        } as Order;
      }
    } catch (err) {
      // 404 is expected if not found, other errors might be network related
      console.warn(
        "[Cloud API] Order not found in DB or DB offline, trying local fallback...",
        err,
      );
    }

    // 2. Fallback to Local Storage (for Demo/Offline consistency)
    // Try to find order in local service (case-insensitive email)
    const hostname = window.location.hostname;
    const isCloudMode =
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      !hostname.startsWith("192.168.");

    if (isCloudMode) {
      console.warn(
        "[Cloud API] Order not found in Cloud DB. Local (Demo) fallback disabled in Cloud Mode.",
      );
      return null;
    }

    try {
      const orders = await localApiService.getOrders();
      const order = orders.find(
        (o) =>
          o.id === normalizedOrderId &&
          o.email?.toLowerCase() === normalizedEmail,
      );
      return order || null;
    } catch (err) {
      console.warn("[Cloud API] Local fallback failed", err);
      return null;
    }
  },

  // --- Management Portal Functions ---
  // In a full deployment, these would also query PocketBase collections.
  // For this version, we keep them linked to the localApiService to ensure
  // the Management Portal works seamlessly with the local demo data.

  async getOrders() {
    return pb.collection("orders").getFullList({ sort: "-created" });
  },

  async getExpenses() {
    return pb.collection("expenses").getFullList({ sort: "-date" });
  },

  async getUsers() {
    return (await pb.collection("users").getFullList()) as User[];
  },

  async getBookings() {
    return pb.collection("bookings").getFullList({ sort: "-created" });
  },

  async getDestinations() {
    return pb.collection("destinations").getFullList();
  },

  async getLoans() {
    return pb.collection("loans").getFullList();
  },

  async getAdjustments() {
    return pb.collection("adjustments").getFullList();
  },

  /**
   * Fetches the Phase 70 generated Daily Location Audits & AI reports.
   */
  async getLocationAudits(dateStr: string) {
    const baseUrl = pb.baseUrlValue;
    const res = await fetch(
      `${baseUrl}/api/analytics/location-audits?date=${dateStr}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      },
    );
    if (!res.ok)
      throw new Error(`Failed to fetch location audits: ${res.statusText}`);
    return res.json();
  },

  /**
   * Login user using the API endpoint
   */
  async loginUser(
    email: string,
    password: string,
  ): Promise<{ token: string; user: User } | null> {
    return (await pb.login(email, password)) as unknown as {
      token: string;
      user: User;
    };
  },

  // --- Generic HTTP Methods for Fleet & Cloud Operations ---

  async get(url: string, options: Record<string, unknown> = {}) {
    const baseUrl = pb.baseUrlValue;
    const res = await fetch(`${baseUrl}${url}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
        ...(options.headers as Record<string, string> | undefined),
      },
      ...options,
    } as Parameters<typeof fetch>[1]);
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.statusText}`);
    return { data: await res.json(), status: res.status };
  },

  async post(url: string, data?: unknown, options: Record<string, unknown> = {}) {
    const baseUrl = pb.baseUrlValue;
    const res = await fetch(`${baseUrl}${url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    } as Parameters<typeof fetch>[1]);
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.statusText}`);
    return { data: await res.json(), status: res.status };
  },

  async patch(url: string, data?: unknown, options: Record<string, unknown> = {}) {
    const baseUrl = pb.baseUrlValue;
    const res = await fetch(`${baseUrl}${url}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    } as Parameters<typeof fetch>[1]);
    if (!res.ok) throw new Error(`PATCH ${url} failed: ${res.statusText}`);
    return { data: await res.json(), status: res.status };
  },

  async delete(url: string, options: Record<string, unknown> = {}) {
    const baseUrl = pb.baseUrlValue;
    const res = await fetch(`${baseUrl}${url}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
        ...(options.headers as Record<string, string> | undefined),
      },
      ...options,
    } as Parameters<typeof fetch>[1]);
    if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.statusText}`);
    return { data: await res.json(), status: res.status };
  },
};
