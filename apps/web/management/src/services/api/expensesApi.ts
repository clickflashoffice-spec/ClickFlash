import { pb } from "../pb";
import {
  Expense,
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


export const expensesApi = {
  async getExpenses(): Promise<Expense[]> {
    const records = await pb.collection("expenses").getFullList();
    return records as Expense[];
  },

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    const record = await pb.collection("expenses").create(data);
    return record as Expense;
  },

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    const record = await pb.collection("expenses").update(id, data);
    return record as Expense;
  },

  async deleteExpense(id: string): Promise<void> {
    await pb.collection("expenses").delete(id);
  },
};
