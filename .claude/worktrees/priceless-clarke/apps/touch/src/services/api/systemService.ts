import { pb } from './core';
import { Destination, Expense, ExpenseCategory, Adjustment, Equipment, Loan, SessionType, EquipmentCategory } from '../../types';
import { PocketRecord } from '../../services/pbTypes';
import { logger } from '../../utils/logger';
import { authService } from './authService'; // For getUsers in initDb

export const systemService = {
    // --- Data Management ---
    async refreshData(collections?: string[], incremental = true): Promise<{ success: boolean; refreshed: string[]; status: any }> {
        const baseUrl = pb.baseUrlValue;
        const response = await fetch(`${baseUrl}/api/data/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pb.authStore.token}`
            },
            body: JSON.stringify({ collections, incremental })
        });

        if (!response.ok) {
            let errorMessage = 'Failed to refresh data';
            try {
                const errorData = await response.json();
                if (errorData.message) errorMessage = errorData.message;
                else if (errorData.error) errorMessage = errorData.error;
            } catch (e) {
                errorMessage = response.statusText || errorMessage;
            }

            const error = new Error(errorMessage);
            const apiError = error as Error & { status?: number; code?: string };
            apiError.status = response.status;
            apiError.code = response.status === 401 ? 'AUTHENTICATION_ERROR' : 'REFRESH_ERROR';
            throw error;
        }

        return await response.json();
    },

    async saveSettings(settings: Record<string, any>): Promise<void> {
        const baseUrl = pb.baseUrlValue;
        const response = await fetch(`${baseUrl}/api/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pb.authStore.token}`
            },
            body: JSON.stringify({ settings })
        });

        if (!response.ok) {
            let errorMessage = 'Failed to save settings';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
    },

    // --- Settings (KV Store) ---
    async getSetting(key: string): Promise<any> {
        try {
            const record = await pb.collection('settings').getOne(key);
            return record.value;
        } catch {
            return null;
        }
    },

    async setSetting(key: string, value: unknown): Promise<void> {
        try {
            await pb.collection('settings').update(key, { value });
        } catch {
            await pb.collection('settings').create({ key, value });
        }
    },

    async verifyDataIntegrity(): Promise<{ counts: { albums: number; photos: number; orders: number }; issues: string[]; storageUsageBytes: number }> {
        return {
            counts: { albums: 0, photos: 0, orders: 0 },
            issues: [],
            storageUsageBytes: 0
        };
    },

    async performMaintenance(): Promise<{ success: boolean; cleaned: number }> {
        return { success: true, cleaned: 0 };
    },

    // --- Destinations ---
    async getDestinations(): Promise<Destination[]> {
        const records = await pb.collection('destinations').getFullList();
        return records as Destination[];
    },

    async createDestination(data: Partial<Destination>): Promise<Destination> {
        try {
            const record = await pb.collection('destinations').create(data);
            return record as Destination;
        } catch (error: any) {
            let errorMessage = 'Failed to create destination';
            if (error?.response?.data) {
                const pbError = error.response.data;
                if (pbError.message) {
                    errorMessage = pbError.message;
                } else if (pbError.data && typeof pbError.data === 'object' && !Array.isArray(pbError.data)) {
                    try {
                        const validationErrors = Object.entries(pbError.data)
                            .map(([field, msg]: [string, any]) => `${field}: ${msg}`)
                            .join(', ');
                        errorMessage = validationErrors || errorMessage;
                    } catch (entriesError) {
                        console.warn('Failed to process validation errors', entriesError);
                    }
                } else if (pbError.error) {
                    errorMessage = pbError.error;
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }

            const finalError = new Error(errorMessage);
            const apiError = finalError as Error & { response?: unknown; status?: number };
            if (error?.response) apiError.response = error.response;
            if (error?.status) apiError.status = error.status;
            throw finalError;
        }
    },

    async updateDestination(id: string, data: Partial<Destination>): Promise<Destination> {
        const record = await pb.collection('destinations').update(id, data);
        return record as Destination;
    },

    async deleteDestination(id: string): Promise<void> {
        await pb.collection('destinations').delete(id);
    },

    // --- Expenses ---
    async getExpenses(): Promise<Expense[]> {
        const records = await pb.collection('expenses').getFullList();
        return records as Expense[];
    },

    async createExpense(data: Partial<Expense>): Promise<Expense> {
        const record = await pb.collection('expenses').create(data);
        return record as Expense;
    },

    async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
        const record = await pb.collection('expenses').update(id, data);
        return record as Expense;
    },

    async deleteExpense(id: string): Promise<void> {
        await pb.collection('expenses').delete(id);
    },

    // --- Expense Categories ---
    async getExpenseCategories(): Promise<ExpenseCategory[]> {
        const records = await pb.collection('expense_categories').getFullList();
        return records as ExpenseCategory[];
    },

    async createExpenseCategory(data: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
        const record = await pb.collection('expense_categories').create(data);
        return record as ExpenseCategory;
    },

    async updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
        const record = await pb.collection('expense_categories').update(id, data);
        return record as ExpenseCategory;
    },

    async deleteExpenseCategory(id: string): Promise<void> {
        await pb.collection('expense_categories').delete(id);
    },

    // --- Session Types ---
    async getSessionTypes(): Promise<SessionType[]> {
        const records = await pb.collection('session_types').getFullList();
        return records as SessionType[];
    },

    async createSessionType(data: Omit<SessionType, 'id'>): Promise<SessionType> {
        const record = await pb.collection('session_types').create(data);
        return record as SessionType;
    },

    async updateSessionType(id: string, data: Partial<SessionType>): Promise<SessionType> {
        const record = await pb.collection('session_types').update(id, data);
        return record as SessionType;
    },

    async deleteSessionType(id: string): Promise<void> {
        await pb.collection('session_types').delete(id);
    },

    // --- Adjustments ---
    async getAdjustments(): Promise<Adjustment[]> {
        const records = await pb.collection('adjustments').getFullList();
        return records as Adjustment[];
    },

    async createAdjustment(data: Partial<Adjustment>): Promise<Adjustment> {
        const record = await pb.collection('adjustments').create(data);
        return record as Adjustment;
    },

    async updateAdjustment(id: string, data: Partial<Adjustment>): Promise<Adjustment> {
        const record = await pb.collection('adjustments').update(id, data);
        return record as Adjustment;
    },

    async deleteAdjustment(id: string): Promise<void> {
        await pb.collection('adjustments').delete(id);
    },

    // --- Equipment ---
    async getEquipment(): Promise<Equipment[]> {
        const records = await pb.collection('equipment').getFullList();
        return records as Equipment[];
    },

    async createEquipment(data: Partial<Equipment>): Promise<Equipment> {
        const record = await pb.collection('equipment').create(data);
        return record as Equipment;
    },

    async updateEquipment(id: string, data: Partial<Equipment>): Promise<Equipment> {
        const record = await pb.collection('equipment').update(id, data);
        return record as Equipment;
    },

    async deleteEquipment(id: string): Promise<void> {
        await pb.collection('equipment').delete(id);
    },

    // --- Loans ---
    async getLoans(): Promise<Loan[]> {
        const records = await pb.collection('loans').getFullList();
        return records as Loan[];
    },

    async createLoan(data: Partial<Loan>): Promise<Loan> {
        const record = await pb.collection('loans').create(data);
        return record as Loan;
    },

    async updateLoan(id: string, data: Partial<Loan>): Promise<Loan> {
        const record = await pb.collection('loans').update(id, data);
        return record as Loan;
    },

    async deleteLoan(id: string): Promise<void> {
        await pb.collection('loans').delete(id);
    },

    // --- Equipment Categories ---
    async getEquipmentCategories(): Promise<EquipmentCategory[]> {
        const records = await pb.collection('equipment_categories').getFullList();
        return records as EquipmentCategory[];
    },

    // --- Kiosk Management ---
    async getKiosks(): Promise<any[]> {
        try {
            const records = await pb.collection('kiosks').getFullList();
            return records.map((r: any) => ({
                id: r.id,
                name: r.name || r.id,
                status: r.status || 'Disconnected'
            }));
        } catch (error) {
            console.error('Failed to fetch kiosks:', error);
            return [];
        }
    },

    async getActiveKioskSessions(): Promise<Set<string>> {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const records = await pb.collection('kiosk_sessions').getFullList({
                filter: `lastSeen >= "${fiveMinutesAgo}"`,
                fields: 'kioskId'
            });
            return new Set(records.map((r: any) => r.kioskId).filter(Boolean));
        } catch (error) {
            try {
                const records = await pb.collection('kiosk_sessions').getFullList({
                    fields: 'kioskId'
                });
                return new Set(records.map((r: any) => r.kioskId).filter(Boolean));
            } catch (fallbackError) {
                console.error('Failed to fetch active kiosk sessions:', fallbackError);
                return new Set();
            }
        }
    },

    async createKiosk(data: Partial<any>): Promise<any> {
        const record = await pb.collection('kiosks').create(data);
        return {
            id: record.id,
            name: record.name || record.id,
            status: record.status || 'Disconnected'
        };
    },

    async updateKiosk(id: string, data: Partial<any>): Promise<any> {
        const record = await pb.collection('kiosks').update(id, data);
        return {
            id: record.id,
            name: record.name || record.id,
            status: record.status || 'Disconnected'
        };
    },

    async deleteKiosk(id: string): Promise<void> {
        await pb.collection('kiosks').delete(id);
    },

    // sendKioskHeartbeat removed to prevent overwriting Master settings.
    async sendKioskHeartbeat(kioskId: string): Promise<void> {
        return Promise.resolve();
    },

    // --- Initialization ---
    async initDb(): Promise<void> {
        try {
            const baseUrl = pb.baseUrlValue;
            try {
                const healthController = new AbortController();
                const healthTimeoutId = setTimeout(() => healthController.abort(), 2000);
                await fetch(`${baseUrl}/api/health`, { signal: healthController.signal });
                clearTimeout(healthTimeoutId);
            } catch (healthError) {
                return;
            }

            const users = await authService.getUsers();
            if (users.length === 0) {
                await authService.createUser({
                    name: 'Admin',
                    email: 'admin@starmaster.local',
                    password: 'admin',
                    role: 'Admin'
                });
                logger.info('[apiService] Created default admin user');
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('ERR_CONNECTION_REFUSED') ||
                errorMessage.includes('Cannot connect to backend');

            if (!isNetworkError) {
                console.warn('[apiService] initDb failed:', e);
            }
        }
    },

    // --- Database Reset ---
    async resetDb(): Promise<void> {
        const baseUrl = pb.baseUrlValue;
        const authToken = localStorage.getItem('authToken');

        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${baseUrl}/api/reset`, {
                method: 'POST',
                headers
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Reset failed' }));
                throw new Error(errorData.message || errorData.error || 'Failed to reset database');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Database reset failed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('ERR_CONNECTION_REFUSED')) {
                throw new Error('Cannot connect to backend server. Please ensure the server is running.');
            }
            throw error;
        }
    },

    // --- Data Export/Import for Sync & Backup ---
    async exportDataForSync(fullBackup: boolean = false): Promise<any> {
        // ... (We might need to inject other services or use a circular import solution if we really want this here)
        // Since this uses ALL services, this is the trickiest one.
        // For now, I'll return a stub or we can implement it by importing other services.
        // Circular dependency risk: authService -> systemService -> authService (initDb uses authService)
        // I imported authService in initDb which works if initDb is called lazily.
        throw new Error("exportDataForSync needs to be refactored or moved to a higher-level manager to avoid circular deps");
    }
};
