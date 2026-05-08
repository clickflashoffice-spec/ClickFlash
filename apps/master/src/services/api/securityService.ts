/**
 * Security Service
 * 
 * Handles administrative security operations like PIN verification and updates.
 */

import { pb } from "../pb";
import { logger } from "../../utils/logger";

export const securityService = {
  /**
   * Verify the administrative PIN
   */
  async verifyAdminPin(pin: string): Promise<boolean> {
    try {
      const csrfToken = await pb.getCsrfToken();
      const response = await fetch(`${pb.baseUrlValue}/api/system/security/verify-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ pin }),
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) return false;
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "PIN verification failed");
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      logger.error("[SecurityService] PIN verification failed", error);
      throw error;
    }
  },

  /**
   * Update the administrative PIN
   */
  async updateAdminPin(currentPin: string, newPin: string): Promise<boolean> {
    try {
      const csrfToken = await pb.getCsrfToken();
      const response = await fetch(`${pb.baseUrlValue}/api/system/security/update-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        body: JSON.stringify({ currentPin, newPin }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "PIN update failed");
      }

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      logger.error("[SecurityService] PIN update failed", error);
      throw error;
    }
  }
};
