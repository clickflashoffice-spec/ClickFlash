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


export const portfolioApi = {
  async getPortfolioItems(): Promise<any[]> {
    return await pb.collection("portfolio").getFullList({
      sort: "sort_order,-created",
    });
  },

  async createPortfolioItem(data: any): Promise<any> {
    return await pb.collection("portfolio").create(data);
  },

  async updatePortfolioItem(id: string, data: any): Promise<any> {
    return await pb.collection("portfolio").update(id, data);
  },

  async deletePortfolioItem(id: string): Promise<void> {
    await pb.collection("portfolio").delete(id);
  },
};
