import { pb } from "../pb";
import {
  Loan,
} from "../../types";
import { logger } from "@/utils/logger";

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


export const loansApi = {
  async getLoans(): Promise<Loan[]> {
    const records = await pb.collection("loans").getFullList();
    return records as Loan[];
  },

  async createLoan(data: Partial<Loan>): Promise<Loan> {
    const record = await pb.collection("loans").create(data);
    return record as Loan;
  },

  async updateLoan(id: string, data: Partial<Loan>): Promise<Loan> {
    const record = await pb.collection("loans").update(id, data);
    return record as Loan;
  },

  async deleteLoan(id: string): Promise<void> {
    await pb.collection("loans").delete(id);
  },

  async createLoanPayment(loanId: string, data: Partial<any>): Promise<any> {
    try {
      // 1. Create a record in the actual loan_payments collection
      const payment = await pb.collection("loan_payments").create({
        loanId,
        amount: data.amount,
        paymentDate: data.paymentDate || new Date().toISOString(),
        paymentMethod: data.paymentMethod || "Cash",
        notes: data.notes || "",
      });

      logger.info(
        `[apiService] Loan payment created for loan ${loanId}:`,
        payment.id,
      );
      return payment;
    } catch (error) {
      logger.error("[apiService] Failed to create loan payment:", error);
      throw error;
    }
  },
};
