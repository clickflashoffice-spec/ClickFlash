/**
 * Loan Service
 * 
 * Handles all CRUD operations for loans and loan payments
 */

import { pb } from '../pb';
import { Loan, LoanPayment } from '../../types';
import { logger } from '../../utils/logger';

export const loanService = {
    /**
     * Get all loans
     */
    async getLoans(): Promise<Loan[]> {
        const records = await pb.collection('loans').getFullList();
        return records as Loan[];
    },

    /**
     * Create a new loan
     */
    async createLoan(data: Partial<Loan>): Promise<Loan> {
        const record = await pb.collection('loans').create(data);
        return record as Loan;
    },

    /**
     * Update an existing loan
     */
    async updateLoan(id: string, data: Partial<Loan>): Promise<Loan> {
        const record = await pb.collection('loans').update(id, data);
        return record as Loan;
    },

    /**
     * Delete a loan
     */
    async deleteLoan(id: string): Promise<void> {
        await pb.collection('loans').delete(id);
    },

    /**
     * Create a loan payment
     */
    async createLoanPayment(loanId: string, payment: Omit<LoanPayment, 'id' | 'loanId'>): Promise<Loan> {
        try {
            const loan = await pb.collection('loans').getOne(loanId);
            const currentPayments = loan.payments || [];
            const newPayment = {
                id: `pay-${Date.now()}`,
                loanId,
                ...payment
            };
            const updatedPayments = [...currentPayments, newPayment];
            const record = await pb.collection('loans').update(loanId, { payments: updatedPayments });
            return record as Loan;
        } catch (error) {
            logger.error('Failed to create loan payment', error instanceof Error ? error : undefined, { loanId, payment });
            throw error;
        }
    }
};

