/**
 * Kiosk Service
 *
 * Handles all kiosk management operations
 */

import { pb } from "../pb";
import { logger } from "../../utils/logger";
import { getErrorMessage } from "../../utils/errorUtils";

export const kioskService = {
  /**
   * Check connectivity to Kiosk (or generally to Master if running on Kiosk)
   * @returns {Promise<boolean>}
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const baseUrl = pb.baseUrlValue;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${baseUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return response.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Get all kiosks
   */
  async getKiosks(): Promise<any[]> {
    try {
      const records = await pb.collection("kiosks").getFullList();
      return records.map((r: Record<string, any>) => {
        let settings = r.settings || {};

        // Robust parsing for better-sqlite3 JSON/String ambiguity
        if (typeof settings === "string") {
          try {
            const parsed = JSON.parse(settings);
            // Check if it was a double-encoded string
            settings = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
          } catch (e) {
            logger.warn("[kioskService] Failed to parse kiosk settings:", {
              id: r.id,
              error: e,
            });
            // Try to salvage if it's a simple string that looks like an object
            if (settings.trim().startsWith("{")) {
              // Attempt 1: Fix double-encoded quotes
              try {
                settings = JSON.parse(settings.replace(/\\"/g, '"'));
              } catch (e2) {
                // Attempt 2: Fix unescaped Windows backslashes (common in file paths)
                // This replaces single backslashes with double, but tries to avoid breaking valid JSON structure
                try {
                  // Naive approach: escape all backslashes, then unescape the JSON structure chars? Too risky.
                  // Better: assuming the only backslashes are in paths, not control chars
                  const fixed = settings.replace(/\\/g, "\\\\");
                  settings = JSON.parse(fixed);
                } catch (e3) {
                  // Last resort: empty object
                  settings = {};
                }
              }
            } else {
              settings = {};
            }
          }
        }

        // Final safety check
        if (!settings || typeof settings !== "object") settings = {};

        return {
          id: r.id,
          name: r.name || r.id,
          status: r.status || "Disconnected",
          settings: settings,
          uploadFolderPath: r.uploadFolderPath,
          ordersFolderPath: r.ordersFolderPath,
        };
      });
    } catch (error) {
      logger.error("Failed to fetch kiosks:", error);
      return [];
    }
  },

  /**
   * Get active kiosk sessions
   */
  async getActiveKioskSessions(): Promise<Set<string>> {
    try {
      const baseUrl = pb.baseUrlValue;
      const response = await fetch(`${baseUrl}/api/kiosk-sessions`);

      if (!response.ok) {
        throw new Error(`Failed to fetch kiosk sessions: ${response.status}`);
      }

      const data = await response.json();
      return new Set(data.activeKioskIds || []);
    } catch (error) {
      logger.error("Failed to fetch active kiosk sessions:", error);
      return new Set();
    }
  },

  /**
   * Create a new kiosk
   */
  async createKiosk(data: Partial<any>): Promise<any> {
    try {
      // Remove status field if it's not in the old valid enum values
      // This is a temporary workaround until backend server is restarted
      const validOldStatuses = [
        "Active",
        "Inactive",
        "Maintenance",
        "Connected",
        "Disconnected",
      ];
      const dataToSend = { ...data };
      if (dataToSend.status && !validOldStatuses.includes(dataToSend.status)) {
        // Don't send status field - let backend use default or set it to 'Active' temporarily
        delete dataToSend.status;
      }

      // Ensure settings is a proper object for JSON serialization
      let settings = dataToSend.settings;
      if (typeof settings === "string") {
        try {
          settings = JSON.parse(settings);
        } catch (e) {
          settings = {};
        }
      }

      if (settings !== undefined && settings !== null) {
        if (typeof settings !== "object" || Array.isArray(settings)) {
          settings = {};
        }
        const cleanedSettings: Record<string, unknown> = {};
        Object.keys(settings).forEach((key) => {
          if (settings[key] !== undefined) {
            cleanedSettings[key] = settings[key];
          }
        });
        dataToSend.settings = cleanedSettings;
      }

      const record = await pb.collection("kiosks").create(dataToSend);
      return {
        id: record.id,
        name: record.name || record.id,
        status: record.status || "Disconnected",
        settings: record.settings || {},
        uploadFolderPath: record.uploadFolderPath,
        ordersFolderPath: record.ordersFolderPath,
      };
    } catch (error: unknown) {
      logger.error("Failed to create kiosk:", error);
      const errorMessage = getErrorMessage(error, "Failed to create kiosk");
      throw new Error(errorMessage);
    }
  },

  /**
   * Update an existing kiosk
   */
  async updateKiosk(id: string, data: Partial<any>): Promise<any> {
    try {
      // Clean settings object similar to create
      const dataToSend = { ...data };

      let settings = dataToSend.settings;
      if (typeof settings === "string") {
        try {
          settings = JSON.parse(settings);
        } catch (e) {
          settings = {};
        }
      }

      if (settings !== undefined && settings !== null) {
        if (typeof settings !== "object" || Array.isArray(settings)) {
          settings = {};
        }
        const cleanedSettings: Record<string, unknown> = {};
        Object.keys(settings).forEach((key) => {
          if (settings[key] !== undefined) {
            cleanedSettings[key] = settings[key];
          }
        });
        dataToSend.settings = cleanedSettings;
      }

      const record = await pb.collection("kiosks").update(id, dataToSend);
      return {
        id: record.id,
        name: record.name || record.id,
        status: record.status || "Disconnected",
        settings: record.settings || {},
        uploadFolderPath: record.uploadFolderPath,
        ordersFolderPath: record.ordersFolderPath,
      };
    } catch (error: unknown) {
      logger.error("Failed to update kiosk:", error);
      const errorMessage = getErrorMessage(error, "Failed to update kiosk");
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a kiosk
   */
  async deleteKiosk(id: string): Promise<void> {
    try {
      // 1. Cleanup sessions & pairing requests (Manual Cascade)
      try {
        // Sessions
        const sessions = await pb.collection("kiosk_sessions").getFullList({
          filter: `kioskId="${id}"`,
        });
        await Promise.all(
          sessions.map((s: Record<string, any>) =>
            pb
              .collection("kiosk_sessions")
              .delete(s.id)
              .catch(() => {}),
          ),
        );

        // Pairing Requests
        const requests = await pb.collection("pairing_requests").getFullList({
          filter: `kioskId="${id}"`,
        });
        await Promise.all(
          requests.map((r: Record<string, any>) =>
            pb
              .collection("pairing_requests")
              .delete(r.id)
              .catch(() => {}),
          ),
        );
      } catch (cleanupError) {
        logger.warn("[kioskService] Cleanup warning:", cleanupError);
      }

      // 2. Delete kiosk
      await pb.collection("kiosks").delete(id);
    } catch (error: unknown) {
      logger.error("Failed to delete kiosk:", error);
      const errorMessage = getErrorMessage(error, "Failed to delete kiosk");
      throw new Error(errorMessage);
    }
  },

  /**
   * Import from shared folder
   */
  async importFromSharedFolder(
    kioskId: string,
  ): Promise<{
    success: boolean;
    imported: number;
    files: Array<{ name: string; path: string; size: number }>;
  }> {
    const csrfToken = await pb.getCsrfToken();
    const response = await fetch(
      `${pb.baseUrlValue}/api/kiosks/${kioskId}/import-from-shared-folder`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pb.authStore.token
            ? { Authorization: `Bearer ${pb.authStore.token}` }
            : {}),
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
      },
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to import from shared folder" }));
      throw new Error(
        errorData.message || "Failed to import from shared folder",
      );
    }

    return await response.json();
  },

  /**
   * Send kiosk heartbeat
   */
  async sendKioskHeartbeat(kioskId: string): Promise<void> {
    try {
      const existing = await pb
        .collection("kiosks")
        .getFirstListItem(`id="${kioskId}"`);
      if (existing) {
        await pb.collection("kiosks").update(kioskId, {
          status: "Connected",
          lastHeartbeat: new Date().toISOString(),
        });
      }
    } catch {
      await pb.collection("kiosks").create({
        id: kioskId,
        name: kioskId,
        status: "Connected",
        lastHeartbeat: new Date().toISOString(),
      });
    }
  },

  /**
   * Send album to kiosk
   */
  async sendAlbumToKiosk(
    albumId: string,
    kioskId: string,
    photoIds?: string[],
  ): Promise<{
    success: boolean;
    message?: string;
    jobIds?: string[];
    copiedCount?: number;
    targetDir?: string;
    progress?: { current: number; total: number; phase: string };
    kioskName?: string;
  }> {
    try {
      const csrfToken = await pb.getCsrfToken();
      const response = await fetch(`${pb.baseUrlValue}/api/kiosk/send-album`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pb.authStore.token
            ? { Authorization: `Bearer ${pb.authStore.token}` }
            : {}),
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({ albumId, kioskId, photoIds }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to send album to kiosk";

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage =
            response.statusText ||
            `HTTP ${response.status}: Failed to send album to kiosk`;
        }

        // Add status code context
        if (response.status === 404) {
          errorMessage =
            "Backend endpoint not found. Please ensure the backend server is running.";
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = "Authentication error. Please log in again.";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please check the backend server logs.";
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Unable to connect to the backend server. Please ensure the server is running.",
        );
      }
      throw error;
    }
  },
};
