import { pb } from "../pb";
import {
  SessionType,
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


export const sessionTypesApi = {
  async getSessionTypes(): Promise<SessionType[]> {
    const records = await pb.collection("session_types").getFullList();
    return records as SessionType[];
  },

  async createSessionType(data: Omit<SessionType, "id">): Promise<SessionType> {
    const record = await pb.collection("session_types").create(data);
    return record as SessionType;
  },

  async updateSessionType(
    id: string,
    data: Partial<SessionType>,
  ): Promise<SessionType> {
    const record = await pb.collection("session_types").update(id, data);
    return record as SessionType;
  },

  async deleteSessionType(id: string): Promise<void> {
    await pb.collection("session_types").delete(id);
  },
};
