/**
 * Orders Service
 * Handles all order-related CRUD operations
 */

import { pb } from "../pb";
import { Order } from "../../types";

export const ordersService = {
  async getOrders(): Promise<Order[]> {
    const records = await pb.collection("orders").getFullList();
    return records as unknown as Order[];
  },

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const record = await pb.collection("orders").getOne(id);
      return record as unknown as Order;
    } catch {
      return null;
    }
  },

  async createOrder(data: Partial<Order>): Promise<Order> {
    const record = await pb.collection("orders").create(data);
    return record as unknown as Order;
  },

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    const record = await pb.collection("orders").update(id, data);
    return record as unknown as Order;
  },

  async deleteOrder(id: string): Promise<void> {
    await pb.collection("orders").delete(id);
  },

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const records = await pb.collection("orders").getList(1, 500, {
      filter: `status = "${status}"`,
    });
    return records.items as unknown as Order[];
  },

  async getOrdersByPhotographer(photographerId: string): Promise<Order[]> {
    const records = await pb.collection("orders").getList(1, 500, {
      filter: `photographerId = "${photographerId}"`,
    });
    return records.items as unknown as Order[];
  },

  async finalizeOrderForCustomerDelivery(orderId: string): Promise<Order> {
    const record = await pb.collection("orders").update(orderId, {
      status: "delivered",
      deliveredAt: new Date().toISOString(),
    });
    return record as unknown as Order;
  },
};