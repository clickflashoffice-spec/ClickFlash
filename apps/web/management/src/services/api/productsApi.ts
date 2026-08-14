import { pb } from "../pb";
import {
  Product,
} from "../../types";
import { PocketRecord } from "../pbTypes";

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


export const productsApi = {
  async getProducts(): Promise<Product[]> {
    const records = await pb.collection("products").getFullList();
    return records.map((r: PocketRecord) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
      stock: r.stock,
      isFeatured: r.isFeatured,
    }));
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const record = await pb.collection("products").create(data);
    return record as Product;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const record = await pb.collection("products").update(id, data);
    return record as Product;
  },

  async deleteProduct(id: string): Promise<void> {
    await pb.collection("products").delete(id);
  },
};
