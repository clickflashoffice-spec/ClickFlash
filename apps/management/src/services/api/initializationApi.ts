import { apiService } from '../apiService';
import { pb } from "../pb";
import {
  Destination,
  Currency,
} from "../../types";
import { logger } from "@/utils/logger";

/**
 * API Service - Wrapper around pb adapter for convenient data operations
 *
 * This service provides a clean interface for all CRUD operations with:
 * - Automatic retry logic for network failures
 * - Comprehensive error handling
 * - Request/response logging in development
 * - Type-safe operations
 *
 * All methods return Promises and handle errors gracefully.
 */


export const initializationApi = {
  async initDb(): Promise<void> {
    // This method is called on app startup to ensure basic data exists
    // For SQLite backend, the schema is already created via migrations
    // We just need to ensure we have at least one user for login
    try {
      // First check if backend is available before trying to initialize
      const baseUrl = pb.baseUrlValue;
      try {
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(
          () => healthController.abort(),
          2000,
        ); // 2 second timeout
        await fetch(`${baseUrl}/api/health`, {
          signal: healthController.signal,
        });
        clearTimeout(healthTimeoutId);
      } catch (healthError) {
        // Backend is not available, skip initialization silently
        return;
      }

      const users = await apiService.getUsers();
      if (users.length === 0) {
        // Create a default admin user
        await apiService.createUser({
          name: "Admin",
          email: "admin@starmaster.local",
          password: "admin",
          role: "Admin",
        });
        logger.info("[apiService] Created default admin user");
      }
    } catch (e) {
      // Only log non-network errors
      const errorMessage = e instanceof Error ? e.message : String(e);
      const isNetworkError =
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_CONNECTION_REFUSED") ||
        errorMessage.includes("Cannot connect to backend");

      if (!isNetworkError) {
        logger.warn("[apiService] initDb failed:", e);
      }
    }
  },

  async getMastersStatus(): Promise<Destination[]> {
    const response = await fetch(
      `${pb.baseUrlValue}/api/system/masters/status`,
      {
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      },
    );
    const json = await response.json();
    return json.data || [];
  },

  async getGlobalAnalytics(
    timeFilter: string = "7D",
    destination: string = "all",
  ): Promise<any> {
    const response = await fetch(
      `${pb.baseUrlValue}/api/analytics/dashboard/global?timeFilter=${timeFilter}&destination=${destination}`,
      {
        headers: {
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      },
    );
    const json = await response.json();
    return json.data;
  },

  async getCurrencies(): Promise<Currency[]> {
    const records = await pb.collection("currencies").getFullList();
    return records as unknown as Currency[];
  },

  async updateCurrencies(currencies: Currency[]): Promise<void> {
    await Promise.all(
      currencies.map((c) => pb.collection("currencies").update(c.id, c as any)),
    );
  },
};
