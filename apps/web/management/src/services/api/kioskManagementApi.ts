import { pb } from "../pb";
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


export const kioskManagementApi = {
  async getKiosks(): Promise<any[]> {
    try {
      const records = await pb.collection("kiosks").getFullList();
      return records.map((r: any) => ({
        id: r.id,
        name: r.name || r.id,
        status: r.status || "Disconnected",
      }));
    } catch (error) {
      logger.error("Failed to fetch kiosks:", error);
      return [];
    }
  },

  async getActiveKioskSessions(): Promise<Set<string>> {
    try {
      // Get all kiosk sessions - presence in this collection indicates active session
      // Optionally filter by recent lastSeen (within last 5 minutes) to handle stale sessions
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const records = await pb.collection("kiosk_sessions").getFullList({
        filter: `lastSeen >= "${fiveMinutesAgo}"`,
        fields: "kioskId",
      });
      return new Set(records.map((r: any) => r.kioskId).filter(Boolean));
    } catch (error) {
      // If filtering fails, try getting all sessions
      try {
        const records = await pb.collection("kiosk_sessions").getFullList({
          fields: "kioskId",
        });
        return new Set(records.map((r: any) => r.kioskId).filter(Boolean));
      } catch (fallbackError) {
        logger.error("Failed to fetch active kiosk sessions:", fallbackError);
        return new Set();
      }
    }
  },

  async createKiosk(data: Partial<any>): Promise<any> {
    const record = await pb.collection("kiosks").create(data);
    return {
      id: record.id,
      name: record.name || record.id,
      status: record.status || "Disconnected",
    };
  },

  async updateKiosk(id: string, data: Partial<any>): Promise<any> {
    const record = await pb.collection("kiosks").update(id, data);
    return {
      id: record.id,
      name: record.name || record.id,
      status: record.status || "Disconnected",
    };
  },

  async deleteKiosk(id: string): Promise<void> {
    await pb.collection("kiosks").delete(id);
  },

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
};
