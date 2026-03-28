import { pb } from '../pb';

export interface LedgerEntry {
    id: string;
    photographer_id: string;
    order_id?: string;
    type: 'Commission' | 'Salary' | 'Bonus' | 'Deduction' | 'Payout';
    amount: number;
    description: string;
    date: string;
    created_at: string;
    sync_status: 'pending' | 'synced';
}

export const ledgerService = {
    async getLedger(filters?: { photographerId?: string; startDate?: string; endDate?: string }) {
        const queryParams = new URLSearchParams();
        if (filters?.photographerId) queryParams.append('photographerId', filters.photographerId);
        if (filters?.startDate) queryParams.append('startDate', filters.startDate);
        if (filters?.endDate) queryParams.append('endDate', filters.endDate);

        const response = await fetch(`${pb.baseUrlValue}/api/ledger?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch ledger');
        }

        const result = await response.json();
        return result.data as LedgerEntry[];
    },

    async addAdjustment(data: {
        photographerId: string;
        type: 'Bonus' | 'Deduction' | 'Payout' | 'Correction';
        amount: number;
        description: string;
        date?: string;
    }) {
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${pb.baseUrlValue}/api/ledger/adjust`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to add adjustment');
        }

        return await response.json();
    }
};
