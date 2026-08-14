/**
 * Expense Service
 * 
 * Handles all CRUD operations for expenses, expense categories, adjustments, and equipment
 */

import { pb } from '../pb';
import { Expense, ExpenseCategory, Adjustment, Equipment } from '../../types';

export const expenseService = {
    // --- Expenses ---
    /**
     * Get all expenses
     */
    async getExpenses(): Promise<Expense[]> {
        const records = await pb.collection('expenses').getFullList();
        return records as Expense[];
    },

    /**
     * Create a new expense
     */
    async createExpense(data: Partial<Expense>): Promise<Expense> {
        const record = await pb.collection('expenses').create(data);
        return record as Expense;
    },

    /**
     * Update an existing expense
     */
    async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
        const record = await pb.collection('expenses').update(id, data);
        return record as Expense;
    },

    /**
     * Delete an expense
     */
    async deleteExpense(id: string): Promise<void> {
        await pb.collection('expenses').delete(id);
    },

    // --- Expense Categories ---
    /**
     * Get all expense categories
     */
    async getExpenseCategories(): Promise<ExpenseCategory[]> {
        const records = await pb.collection('expense_categories').getFullList();
        return records as ExpenseCategory[];
    },

    /**
     * Create a new expense category
     */
    async createExpenseCategory(data: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
        const record = await pb.collection('expense_categories').create(data);
        return record as ExpenseCategory;
    },

    /**
     * Update an existing expense category
     */
    async updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
        const record = await pb.collection('expense_categories').update(id, data);
        return record as ExpenseCategory;
    },

    /**
     * Delete an expense category
     */
    async deleteExpenseCategory(id: string): Promise<void> {
        await pb.collection('expense_categories').delete(id);
    },

    // --- Adjustments ---
    /**
     * Get all adjustments
     */
    async getAdjustments(): Promise<Adjustment[]> {
        const records = await pb.collection('adjustments').getFullList();
        return records as Adjustment[];
    },

    /**
     * Create a new adjustment
     */
    async createAdjustment(data: Partial<Adjustment>): Promise<Adjustment> {
        const record = await pb.collection('adjustments').create(data);
        return record as Adjustment;
    },

    /**
     * Update an existing adjustment
     */
    async updateAdjustment(id: string, data: Partial<Adjustment>): Promise<Adjustment> {
        const record = await pb.collection('adjustments').update(id, data);
        return record as Adjustment;
    },

    /**
     * Delete an adjustment
     */
    async deleteAdjustment(id: string): Promise<void> {
        await pb.collection('adjustments').delete(id);
    },

    // --- Equipment ---
    /**
     * Get all equipment
     */
    async getEquipment(): Promise<Equipment[]> {
        const records = await pb.collection('equipment').getFullList();
        return records as Equipment[];
    },

    /**
     * Create a new equipment record
     */
    async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
        const record = await pb.collection('equipment').create(data);
        return record as Equipment;
    },

    /**
     * Update an existing equipment record
     */
    async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
        const record = await pb.collection('equipment').update(id, data);
        return record as Equipment;
    },

    /**
     * Delete an equipment record
     */
    async deleteEquipment(id: string): Promise<void> {
        await pb.collection('equipment').delete(id);
    }
};

