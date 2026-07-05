/**
 * GDPR Service
 *
 * Frontend API service for GDPR compliance operations.
 */

import { pb } from "../pb";
// @ts-ignore
import { logger } from "../../utils/logger";

export const gdprService = {
  /**
   * Get GDPR dashboard statistics
   */
  async getStats(): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/gdpr/stats`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch GDPR stats");
    return response.json();
  },

  /**
   * Get pending export requests
   */
  async getExports(): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/gdpr/exports`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch export requests");
    return response.json();
  },

  /**
   * Get breach incidents
   */
  async getBreaches(): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/gdpr/breaches`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch breach incidents");
    return response.json();
  },

  /**
   * Apply retention policy
   */
  async applyRetention(): Promise<any> {
    const response = await fetch(`${pb.baseUrlValue}/api/gdpr/retention/apply`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to apply retention policy");
    return response.json();
  },

  /**
   * Generate DPA document
   */
  async generateDpa(studioName: string): Promise<{ dpa: string }> {
    const response = await fetch(
      `${pb.baseUrlValue}/api/gdpr/dpa?studioName=${encodeURIComponent(studioName)}`,
      { credentials: "include" }
    );
    if (!response.ok) throw new Error("Failed to generate DPA");
    return response.json();
  },

  /**
   * Export all customer data
   */
  async exportAll(): Promise<Blob> {
    const response = await fetch(`${pb.baseUrlValue}/api/gdpr/export/all`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to export data");
    return response.blob();
  },

  /**
   * Delete customer data (GDPR Article 17)
   */
  async deleteCustomer(customerId: string): Promise<any> {
    const response = await fetch(
      `${pb.baseUrlValue}/api/gdpr/customers/${encodeURIComponent(customerId)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (!response.ok) throw new Error("Failed to delete customer data");
    return response.json();
  },
};
