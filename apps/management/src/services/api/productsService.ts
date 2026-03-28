/**
 * Products Service
 * Handles product and pack-related CRUD operations
 */

import { pb } from "../pb";
import { Product, Pack } from "../../types";

export const productsService = {
  async getProducts(): Promise<Product[]> {
    const records = await pb.collection("products").getFullList();
    return records as unknown as Product[];
  },

  async getProduct(id: string): Promise<Product | null> {
    try {
      const record = await pb.collection("products").getOne(id);
      return record as unknown as Product;
    } catch {
      return null;
    }
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const record = await pb.collection("products").create(data);
    return record as unknown as Product;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const record = await pb.collection("products").update(id, data);
    return record as unknown as Product;
  },

  async deleteProduct(id: string): Promise<void> {
    await pb.collection("products").delete(id);
  },

  async getPacks(): Promise<Pack[]> {
    const records = await pb.collection("packs").getFullList();
    return records as unknown as Pack[];
  },

  async getPack(id: string): Promise<Pack | null> {
    try {
      const record = await pb.collection("packs").getOne(id);
      return record as unknown as Pack;
    } catch {
      return null;
    }
  },

  async createPack(data: Partial<Pack>): Promise<Pack> {
    const record = await pb.collection("packs").create(data);
    return record as unknown as Pack;
  },

  async updatePack(id: string, data: Partial<Pack>): Promise<Pack> {
    const record = await pb.collection("packs").update(id, data);
    return record as unknown as Pack;
  },

  async deletePack(id: string): Promise<void> {
    await pb.collection("packs").delete(id);
  },
};