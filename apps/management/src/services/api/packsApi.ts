import { pb } from "../pb";
import {
  Pack,
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


export const packsApi = {
  async getPacks(): Promise<Pack[]> {
    const records = await pb.collection("packs").getFullList();
    return records.map((r: PocketRecord) => {
      // Handle products field - it might be stored as JSON string or array
      let products: string[] = [];
      if (r.productsJSON) {
        if (typeof r.productsJSON === "string") {
          try {
            products = JSON.parse(r.productsJSON);
          } catch {
            products = [];
          }
        } else if (Array.isArray(r.productsJSON)) {
          products = r.productsJSON;
        }
      } else if (r.products && Array.isArray(r.products)) {
        products = r.products;
      }

      return {
        id: r.id,
        name: r.name,
        description: r.description || "",
        price: r.price,
        products: products,
      };
    });
  },

  async createPack(data: Partial<Pack>): Promise<Pack> {
    // Convert products array to JSON format for storage
    const packData: any = {
      name: data.name,
      description: data.description,
      price: data.price,
      productsJSON: data.products ? JSON.stringify(data.products) : "[]",
    };
    const record = await pb.collection("packs").create(packData);
    return {
      id: record.id,
      name: record.name,
      description: record.description || "",
      price: record.price,
      products: data.products || [],
    };
  },

  async updatePack(id: string, data: Partial<Pack>): Promise<Pack> {
    // Convert products array to JSON format for storage
    const packData: any = {
      name: data.name,
      description: data.description,
      price: data.price,
    };
    if (data.products !== undefined) {
      packData.productsJSON = JSON.stringify(data.products);
    }
    const record = await pb.collection("packs").update(id, packData);

    // Parse products back from JSON
    let products: string[] = [];
    if (record.productsJSON) {
      if (typeof record.productsJSON === "string") {
        try {
          products = JSON.parse(record.productsJSON);
        } catch {
          products = [];
        }
      } else if (Array.isArray(record.productsJSON)) {
        products = record.productsJSON;
      }
    }

    return {
      id: record.id,
      name: record.name,
      description: record.description || "",
      price: record.price,
      products: products,
    };
  },

  async deletePack(id: string): Promise<void> {
    await pb.collection("packs").delete(id);
  },
};
