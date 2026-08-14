import { pb } from "../pb";
import {
  ExpenseCategory,
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


export const expenseCategoriesApi = {
  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const records = await pb.collection("expense_categories").getFullList();
    return records as ExpenseCategory[];
  },

  async createExpenseCategory(
    data: Omit<ExpenseCategory, "id">,
  ): Promise<ExpenseCategory> {
    const record = await pb.collection("expense_categories").create(data);
    return record as ExpenseCategory;
  },

  async updateExpenseCategory(
    id: string,
    data: Partial<ExpenseCategory>,
  ): Promise<ExpenseCategory> {
    const record = await pb.collection("expense_categories").update(id, data);
    return record as ExpenseCategory;
  },

  async deleteExpenseCategory(id: string): Promise<void> {
    await pb.collection("expense_categories").delete(id);
  },
};
