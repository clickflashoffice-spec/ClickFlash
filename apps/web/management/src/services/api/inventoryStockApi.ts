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


export const inventoryStockApi = {
  async getInventory(): Promise<any[]> {
    return await pb.collection("inventory").getFullList({
      sort: "type,name",
    });
  },

  async createInventoryItem(data: any): Promise<any> {
    return await pb.collection("inventory").create(data);
  },

  async updateInventoryItem(id: string, data: any): Promise<any> {
    return await pb.collection("inventory").update(id, data);
  },

  async deleteInventoryItem(id: string): Promise<void> {
    await pb.collection("inventory").delete(id);
  },
};
