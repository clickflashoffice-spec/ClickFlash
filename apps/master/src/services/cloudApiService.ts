
/**
 * API Service for Cloud-Based Portals (Customer & Management)
 * 
 * Connects to the PocketBase backend ("The Cloud") to fetch real data.
 */

import { apiService as localApiService } from './apiService';
import { Order } from '../types.ts';
import { pb } from './pb';
import { logger } from '@/utils/logger';

export const cloudApiService = {
    /**
     * Fetches an order by credentials from the PocketBase backend.
     */
    async getOrderByCredentials(orderId: string, email: string): Promise<Order | null> {
        // Normalize inputs: trim whitespace and lowercase email
        const normalizedOrderId = orderId.trim();
        const normalizedEmail = email.trim().toLowerCase();

        try {
            // 1. Try PocketBase (Realtime Engine)
            // Note: We filter by ID and Email for security
            // First try exact match with normalized email
            let record;
            try {
                record = await pb.collection('orders').getFirstListItem(`id="${normalizedOrderId}" && email="${normalizedEmail}"`);
            } catch (exactMatchError) {
                // If exact match fails, try to get by ID and filter email case-insensitively
                try {
                    const orders = await pb.collection('orders').getList(1, 50, {
                        filter: `id="${normalizedOrderId}"`
                    });
                    record = orders.items.find((o: any) => o.email?.toLowerCase() === normalizedEmail) || null;
                } catch (_fallbackError) {
                    throw exactMatchError; // Throw original error
                }
            }

            if (record) {
                return {
                    id: record.id,
                    clientName: record.clientName,
                    email: record.email,
                    total: record.total,
                    status: record.status,
                    items: record.itemsJSON || [], // Hydrate items from JSON field
                    date: record.created.split(' ')[0], // YYYY-MM-DD
                    photographerId: record.photographerId,
                    destinationId: record.destinationId,
                    appliedDiscount: 0
                } as Order;
            }
        } catch (err) {
            // 404 is expected if not found, other errors might be network related
            logger.warn("[Cloud API] Order not found in DB or DB offline, trying local fallback...", err);
        }

        // 2. Fallback to Local Storage (for Demo/Offline consistency)
        // Try to find order in local service (case-insensitive email)
        try {
            const result = await (localApiService.getOrders() as any);
            const orders = Array.isArray(result) ? result : (result?.data || []);
            const order = (orders as Order[]).find(o => o.id === normalizedOrderId && o.email?.toLowerCase() === normalizedEmail);
            return order || null;
        } catch (err) {
            logger.warn("[Cloud API] Local fallback failed", err);
            return null;
        }
    },

    async getMoneyTrashStats(): Promise<any> {
        return pb.collection('money_trash').getFullList();
    },

    async updateMoneyTrashSettings(settings: any): Promise<any> {
        // Sync settings to cloud hub
        return pb.collection('settings').update('money_trash', { value: settings });
    },

    // --- Management Portal Functions ---
    // In a full deployment, these would also query PocketBase collections.
    // For this version, we keep them linked to the localApiService to ensure
    // the Management Portal works seamlessly with the local demo data.

    async getOrders() {
        return localApiService.getOrders();
    },

    async getExpenses() {
        return localApiService.getExpenses();
    },

    async getUsers() {
        return localApiService.getUsers();
    },

    async getDestinations() {
        return localApiService.getDestinations();
    },

    async getLoans() {
        return localApiService.getLoans();
    },

    async getAdjustments() {
        return localApiService.getAdjustments();
    },

    /**
     * Login user using the API endpoint (works for both local and cloud)
     */
    async loginUser(email: string, password: string) {
        return localApiService.loginUser(email, password);
    }
};
