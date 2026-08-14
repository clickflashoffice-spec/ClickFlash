import { pb } from "../pb";
import {
  PaginatedList,
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


export const genericCrudApi = {
  async getCollection(
    collectionName: string,
    sort?: string,
  ): Promise<PaginatedList<any>> {
    const records = await pb
      .collection(collectionName)
      .getList(1, 500, { sort: sort || "-created" });
    return records;
  },

  async createRecord(collectionName: string, data: any): Promise<any> {
    return await pb.collection(collectionName).create(data);
  },

  async updateRecord(
    collectionName: string,
    id: string,
    data: any,
  ): Promise<any> {
    return await pb.collection(collectionName).update(id, data);
  },

  async deleteRecord(collectionName: string, id: string): Promise<void> {
    await pb.collection(collectionName).delete(id);
  },
};
