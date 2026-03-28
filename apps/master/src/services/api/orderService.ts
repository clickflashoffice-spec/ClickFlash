/**
 * Order Service
 * 
 * Handles all CRUD operations for orders
 */

import { pb } from '../pb';
import { PocketRecord } from '../pbTypes';
import { Order } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Generate a short, user-friendly order number (e.g., A7B2-9X3Z)
 */
function generateOrderNumber(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let result = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) result += '-';
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const orderService = {
    /**
     * Get all orders
     */
    /**
     * Get orders (Server-Side Filtered)
     * Replaces PB.getFullList() with optimized SQLite query
     */
    async getOrders(page = 1, limit = 50, filters: { status?: string, search?: string, dateFrom?: string, dateTo?: string } = {}): Promise<{ data: Order[], total: number, page: number, totalPages: number }> {
        const params = new window.URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);

        // Fetch from custom backend
        const response = await fetch(`/api/orders?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }

        const result = await response.json();

        // Ensure items are properly formatted (backend already parses JSON items)
        return {
            data: result.data as Order[],
            total: result.total,
            page: result.page,
            totalPages: result.totalPages
        };
    },


    /**
     * Get orders with pagination
     */
    async getOrdersPaginated(page = 1, perPage = 50, sort = '-created', filter = ''): Promise<{ items: Order[], totalItems: number, totalPages: number }> {
        const result = await pb.collection('orders').getList(page, perPage, {
            sort: sort,
            filter: filter
        });

        return {
            items: result.items.map((r: PocketRecord) => ({
                id: r.id,
                clientName: r.clientName || '',
                email: r.email || '',
                total: r.total || 0,
                status: r.status || '',
                items: typeof r.itemsJSON === 'string' ? JSON.parse(r.itemsJSON) : (r.items || []),
                date: r.date || (r.created ? r.created.split(' ')[0] : ''),
                photographerId: r.photographerId || '',
                destinationId: r.destinationId || '',
                appliedDiscount: r.appliedDiscount || 0,
                orderNumber: r.orderNumber || r.id.substring(0, 8),
                source: r.source
            })) as Order[],
            totalItems: result.totalItems,
            totalPages: result.totalPages
        };
    },

    /**
     * Get a single order by ID
     */
    async getOrder(id: string): Promise<Order> {
        const record = await pb.collection('orders').getOne(id);
        return {
            id: record.id,
            clientName: record.clientName || '',
            email: record.email || '',
            total: record.total || 0,
            status: record.status || '',
            items: typeof record.itemsJSON === 'string' ? JSON.parse(record.itemsJSON) : (record.items || []),
            date: record.date || (record.created ? record.created.split(' ')[0] : ''),
            photographerId: record.photographerId || '',
            destinationId: record.destinationId || '',
            appliedDiscount: record.appliedDiscount || 0
        } as Order;
    },

    /**
     * Create a new order
     */
    async createOrder(data: Partial<Order>): Promise<Order> {
        const orderData: Partial<Order> & { itemsJSON?: string } = { ...data };

        // Prevent duplicates by checking if orderNumber already exists
        if (orderData.orderNumber) {
            const existing = await pb.collection('orders').getFirstListItem(`orderNumber="${orderData.orderNumber}"`).catch(() => null);
            if (existing) {
                logger.info('Duplicate order ignored', { orderNumber: orderData.orderNumber });
                return {
                    ...existing,
                    items: typeof existing.itemsJSON === 'string' ? JSON.parse(existing.itemsJSON) : (existing.items || [])
                } as Order;
            }
        }

        if (orderData.items && Array.isArray(orderData.items)) {
            orderData.itemsJSON = JSON.stringify(orderData.items);
        }

        // Generate short order number if not present
        if (!orderData.orderNumber) {
            orderData.orderNumber = generateOrderNumber();
        }

        const record = await pb.collection('orders').create(orderData);
        return {
            ...record,
            items: typeof record.itemsJSON === 'string' ? JSON.parse(record.itemsJSON) : (record.items || []),
            orderNumber: record.orderNumber
        } as Order;
    },

    /**
     * Update an existing order
     */
    async updateOrder(id: string, data: Partial<Order>, retryCount = 0): Promise<Order> {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        try {
            const orderData: Partial<Order> & { itemsJSON?: string } = { ...data };
            if (orderData.items && Array.isArray(orderData.items)) {
                orderData.itemsJSON = JSON.stringify(orderData.items);
            }

            const record = await pb.collection('orders').update(id, orderData);
            return {
                ...record,
                items: typeof record.itemsJSON === 'string' ? JSON.parse(record.itemsJSON) : (record.items || [])
            } as Order;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout');
            const isConflict = errorMessage.includes('conflict') ||
                errorMessage.includes('modified');

            // Don't retry on conflict errors
            if (isConflict) {
                logger.warn('Order update conflict detected', { orderId: id, error: errorMessage });
                throw error;
            }

            // Retry on network errors
            if (retryCount < MAX_RETRIES && isNetworkError) {
                logger.info(`Retrying order update (attempt ${retryCount + 1}/${MAX_RETRIES})`, { orderId: id });
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
                return this.updateOrder(id, data, retryCount + 1);
            }

            logger.error('Failed to update order', error instanceof Error ? error : undefined, { orderId: id, retryCount });
            throw error;
        }
    },

    /**
     * Delete an order
     */
    async deleteOrder(id: string): Promise<void> {
        try {
            if (!id) {
                throw new Error('Order ID is required');
            }
            await pb.collection('orders').delete(id);
        } catch (error) {
            logger.error('Failed to delete order', error instanceof Error ? error : undefined, { orderId: id });
            throw error;
        }
    },

    /**
     * Finalize order for customer delivery
     * Mock implementation - in a real app, this would trigger email sending, etc.
     */
    async finalizeOrderForCustomerDelivery(orderId: string): Promise<Order> {
        // Mock implementation for now
        // In a real app, this would trigger email sending, etc.
        // We update the status to 'Delivered'
        // Also ensure orderNumber is returned if it exists
        const order = await this.updateOrder(orderId, { status: 'Delivered' });
        return order;
    },

    /**
     * Send photo to printer via Backend
     */
    async printOrderPhoto(orderId: string, photoId: string, printerName?: string): Promise<void> {
        // We use the custom backend route: POST /api/orders/:id/print
        // This is a custom Express route, NOT a PocketBase record operation
        // So we use standard fetch, pointing to the backend API base

        // PB SDK usually wraps fetch, but for custom routes on same origin:
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`/api/orders/${orderId}/print`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify({ photoId, printerName })
        });

        if (!response.ok) {
            throw new Error(`Print failed: ${response.statusText}`);
        }
    },

    /**
     * Update order status via custom backend (broadcasts to Kiosks)
     */
    async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
        try {
            const csrfToken = await pb.getCsrfToken();
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update status');
            }

            return true;
        } catch (error) {
            logger.error('Status update failed', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Get and print production slip for an order
     */
    async getOrderProductionSlip(orderId: string): Promise<void> {
        try {
            const csrfToken = await pb.getCsrfToken();
            const response = await fetch(`/api/orders/${orderId}/slip`, {
                method: 'POST',
                headers: {
                    ...(pb.authStore.token ? { 'Authorization': `Bearer ${pb.authStore.token}` } : {}),
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to generate slip: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ProductionSlip_${orderId}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            logger.error('Production slip download failed', error instanceof Error ? error : undefined);
            throw error;
        }
    }
};

