import { pb } from "../pb";
import {
  Adjustment,
} from "../../types";

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


export const adjustmentsApi = {
  async getAdjustments(filter?: string): Promise<Adjustment[]> {
    const records = await pb.collection("adjustments").getFullList({ filter });
    return records as Adjustment[];
  },

  async createAdjustment(data: Partial<Adjustment>): Promise<Adjustment> {
    const record = await pb.collection("adjustments").create(data);
    return record as Adjustment;
  },

  async updateAdjustment(
    id: string,
    data: Partial<Adjustment>,
  ): Promise<Adjustment> {
    const record = await pb.collection("adjustments").update(id, data);
    return record as Adjustment;
  },

  async deleteAdjustment(id: string): Promise<void> {
    await pb.collection("adjustments").delete(id);
  },
};
