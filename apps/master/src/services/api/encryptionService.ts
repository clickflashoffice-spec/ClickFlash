/**
 * Encryption Service
 *
 * Frontend API service for database encryption operations.
 */

import { pb } from "../pb";

export const encryptionService = {
  /**
   * Get current encryption status
   */
  async getStatus(): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/encryption/status`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch encryption status");
    return response.json();
  },

  /**
   * Get backup encryption status
   */
  async getBackupStatus(): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/encryption/backup-status`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch backup status");
    return response.json();
  },

  /**
   * Enable database encryption
   */
  async enable(password: string): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/encryption/enable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to enable encryption");
    }
    return response.json();
  },

  /**
   * Rotate encryption key
   */
  async rotateKey(oldPassword: string, newPassword: string): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/encryption/rotate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
      credentials: "include",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Failed to rotate key");
    }
    return response.json();
  },
};
