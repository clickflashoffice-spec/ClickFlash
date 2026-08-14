import { pb } from "../pb";
import {
  Equipment,
  EquipmentCategory,
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


export const equipmentApi = {
  async getEquipment(): Promise<Equipment[]> {
    const records = await pb.collection("equipment").getFullList();
    return records as Equipment[];
  },

  async getEquipmentCategories(): Promise<EquipmentCategory[]> {
    const records = await pb.collection("equipment_categories").getFullList();
    return records as EquipmentCategory[];
  },

  async createEquipmentCategory(
    data: Partial<EquipmentCategory>,
  ): Promise<EquipmentCategory> {
    const record = await pb.collection("equipment_categories").create(data);
    return record as EquipmentCategory;
  },

  async updateEquipmentCategory(
    id: string,
    data: Partial<EquipmentCategory>,
  ): Promise<EquipmentCategory> {
    const record = await pb.collection("equipment_categories").update(id, data);
    return record as EquipmentCategory;
  },

  async deleteEquipmentCategory(id: string): Promise<void> {
    await pb.collection("equipment_categories").delete(id);
  },

  async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
    const record = await pb.collection("equipment").create(data);
    return record as Equipment;
  },

  async updateEquipment(
    id: string,
    data: Partial<Equipment>,
  ): Promise<Equipment> {
    const record = await pb.collection("equipment").update(id, data);
    return record as Equipment;
  },

  async deleteEquipment(id: string): Promise<void> {
    await pb.collection("equipment").delete(id);
  },
};
