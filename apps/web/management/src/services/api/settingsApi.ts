import { apiService } from '../apiService';
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


export const settingsApi = {
  async getSetting(key: string): Promise<any> {
    try {
      const record = await pb.collection("settings").getOne(key);
      return record.value;
    } catch {
      return null;
    }
  },

  async setSetting(key: string, value: unknown): Promise<void> {
    try {
      await pb.collection("settings").update(key, { value });
    } catch {
      await pb.collection("settings").create({ key, value });
    }
  },

  async saveSetting(key: string, value: unknown): Promise<void> {
    return apiService.setSetting(key, value);
  },
};
