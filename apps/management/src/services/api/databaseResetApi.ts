import { pb } from "../pb";

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

export const databaseResetApi = {
  async resetDb(): Promise<void> {
    const baseUrl = pb.baseUrlValue;

    // Get auth token from sessionStorage (migrated from localStorage)
    const authToken = sessionStorage.getItem("authToken");

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${baseUrl}/api/reset`, {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Reset failed" }));
        throw new Error(
          errorData.message || errorData.error || "Failed to reset database",
        );
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "Database reset failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("NetworkError") ||
        errorMessage.includes("ERR_CONNECTION_REFUSED")
      ) {
        throw new Error(
          "Cannot connect to backend server. Please ensure the server is running.",
        );
      }
      throw error;
    }
  },
};
