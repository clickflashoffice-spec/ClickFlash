/**
 * Sync Service
 * Handles data synchronization, backup, and restore operations
 */

import { pb } from "../pb";
import { SyncLog, Destination } from "../../types";
import { logger } from "../../utils/logger";

export const syncService = {
  async getSyncLogs(limit = 100): Promise<SyncLog[]> {
    const records = await pb.collection("sync_logs").getList(1, limit, {
      sort: "-created",
    });
    return records.items as unknown as SyncLog[];
  },

  async getDestinations(): Promise<Destination[]> {
    const records = await pb.collection("destinations").getFullList();
    return records as unknown as Destination[];
  },

  async getDestination(id: string): Promise<Destination | null> {
    try {
      const record = await pb.collection("destinations").getOne(id);
      return record as unknown as Destination;
    } catch {
      return null;
    }
  },

  async createDestination(data: Partial<Destination>): Promise<Destination> {
    const record = await pb.collection("destinations").create(data);
    return record as unknown as Destination;
  },

  async updateDestination(id: string, data: Partial<Destination>): Promise<Destination> {
    const record = await pb.collection("destinations").update(id, data);
    return record as unknown as Destination;
  },

  async deleteDestination(id: string): Promise<void> {
    await pb.collection("destinations").delete(id);
  },

  async exportDataForSync(fullBackup: boolean = false): Promise<unknown> {
    logger.info("Starting data export for sync", { fullBackup });

    const collections = fullBackup
      ? ["users", "orders", "albums", "photos", "products", "packs", "equipment", "loans", "destinations"]
      : ["orders", "albums", "photos"];

    const data: Record<string, unknown[]> = {};

    for (const collection of collections) {
      try {
        const records = await pb.collection(collection).getFullList();
        data[collection] = records;
        logger.debug(`Exported ${records.length} records from ${collection}`);
      } catch (error) {
        logger.error(`Failed to export ${collection}`, error);
        data[collection] = [];
      }
    }

    return {
      timestamp: new Date().toISOString(),
      version: "4.1.0",
      fullBackup,
      data,
    };
  },

  async importDataFromBackup(backupData: unknown): Promise<void> {
    const backup = backupData as {
      timestamp: string;
      data: Record<string, unknown[]>;
    };

    logger.info("Starting data import from backup", { timestamp: backup.timestamp });

    for (const [collection, records] of Object.entries(backup.data)) {
      try {
        for (const record of records as unknown[]) {
          await pb.collection(collection).create(record as Record<string, unknown>);
        }
        logger.info(`Imported ${(records as unknown[]).length} records to ${collection}`);
      } catch (error) {
        logger.error(`Failed to import ${collection}`, error);
      }
    }
  },

  async getMastersStatus(): Promise<Destination[]> {
    const records = await pb.collection("destinations").getList(1, 50, {
      filter: 'type = "master"',
    });
    return records.items as unknown as Destination[];
  },
};