/**
 * Inventory Service
 * Handles equipment, loans, bookings, expenses, and settings
 */

import { pb } from "../pb";
import { Equipment, Loan, Booking, Expense, ExpenseCategory, Adjustment, SessionType } from "../../types";

export const inventoryService = {
  // Equipment
  async getEquipment(): Promise<Equipment[]> {
    const records = await pb.collection("equipment").getFullList();
    return records as unknown as Equipment[];
  },

  async getEquipmentCategories(): Promise<string[]> {
    const records = await pb.collection("equipment_category").getFullList();
    return records.map((r) => r.name);
  },

  async createEquipmentCategory(name: string): Promise<void> {
    await pb.collection("equipment_category").create({ name });
  },

  async updateEquipmentCategory(id: string, name: string): Promise<void> {
    await pb.collection("equipment_category").update(id, { name });
  },

  async deleteEquipmentCategory(id: string): Promise<void> {
    await pb.collection("equipment_category").delete(id);
  },

  async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
    const record = await pb.collection("equipment").create(data);
    return record as unknown as Equipment;
  },

  async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
    const record = await pb.collection("equipment").update(id, data);
    return record as unknown as Equipment;
  },

  // Loans
  async getLoans(): Promise<Loan[]> {
    const records = await pb.collection("loans").getFullList();
    return records as unknown as Loan[];
  },

  async createLoan(data: Partial<Loan>): Promise<Loan> {
    const record = await pb.collection("loans").create(data);
    return record as unknown as Loan;
  },

  async updateLoan(id: string, data: Partial<Loan>): Promise<Loan> {
    const record = await pb.collection("loans").update(id, data);
    return record as unknown as Loan;
  },

  async createLoanPayment(loanId: string, data: Partial<unknown>): Promise<unknown> {
    const record = await pb.collection("loan_payments").create({
      ...data,
      loanId,
    });
    return record;
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const records = await pb.collection("bookings").getFullList();
    return records as unknown as Booking[];
  },

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    const record = await pb.collection("bookings").create(data);
    return record as unknown as Booking;
  },

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const record = await pb.collection("bookings").update(id, data);
    return record as unknown as Booking;
  },

  async deleteBooking(id: string): Promise<void> {
    await pb.collection("bookings").delete(id);
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const records = await pb.collection("expenses").getFullList();
    return records as unknown as Expense[];
  },

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    const record = await pb.collection("expenses").create(data);
    return record as unknown as Expense;
  },

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    const record = await pb.collection("expenses").update(id, data);
    return record as unknown as Expense;
  },

  async deleteExpense(id: string): Promise<void> {
    await pb.collection("expenses").delete(id);
  },

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const records = await pb.collection("expense_categories").getFullList();
    return records as unknown as ExpenseCategory[];
  },

  async createExpenseCategory(data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const record = await pb.collection("expense_categories").create(data);
    return record as unknown as ExpenseCategory;
  },

  async updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const record = await pb.collection("expense_categories").update(id, data);
    return record as unknown as ExpenseCategory;
  },

  async deleteExpenseCategory(id: string): Promise<void> {
    await pb.collection("expense_categories").delete(id);
  },

  // Adjustments
  async getAdjustments(): Promise<Adjustment[]> {
    const records = await pb.collection("adjustments").getFullList();
    return records as unknown as Adjustment[];
  },

  async createAdjustment(data: Partial<Adjustment>): Promise<Adjustment> {
    const record = await pb.collection("adjustments").create(data);
    return record as unknown as Adjustment;
  },

  async updateAdjustment(id: string, data: Partial<Adjustment>): Promise<Adjustment> {
    const record = await pb.collection("adjustments").update(id, data);
    return record as unknown as Adjustment;
  },

  // Session Types
  async getSessionTypes(): Promise<SessionType[]> {
    const records = await pb.collection("session_types").getFullList();
    return records as unknown as SessionType[];
  },

  async createSessionType(data: Omit<SessionType, "id">): Promise<SessionType> {
    const record = await pb.collection("session_types").create(data);
    return record as unknown as SessionType;
  },

  async updateSessionType(id: string, data: Partial<SessionType>): Promise<SessionType> {
    const record = await pb.collection("session_types").update(id, data);
    return record as unknown as SessionType;
  },

  async deleteSessionType(id: string): Promise<void> {
    await pb.collection("session_types").delete(id);
  },

  // Settings
  async getSetting(key: string): Promise<unknown> {
    try {
      const records = await pb.collection("settings").getList(1, 1, {
        filter: `key = "${key}"`,
      });
      return records.items[0]?.value;
    } catch {
      return null;
    }
  },

  async setSetting(key: string, value: unknown): Promise<void> {
    const records = await pb.collection("settings").getList(1, 1, {
      filter: `key = "${key}"`,
    });
    if (records.items[0]) {
      await pb.collection("settings").update(records.items[0].id, { value });
    } else {
      await pb.collection("settings").create({ key, value });
    }
  },
};