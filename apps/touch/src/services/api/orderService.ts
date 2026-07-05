import { pb } from './core';
import { Order, Product, Pack, Booking } from '../../types';
import { PocketRecord } from '../../services/pbTypes';
import { logger } from '../../utils/logger';

export const orderService = {
    // --- Orders ---
    async getOrders(): Promise<Order[]> {
        const records = await pb.collection('orders').getFullList({ sort: '-created' });
        return records.map((r: PocketRecord) => ({
            id: r.id,
            date: r.date,
            clientName: r.clientName,
            email: r.email,
            status: r.status,
            total: r.total,
            photographerId: r.photographerId,
            destinationId: r.destinationId,
            paymentMethod: r.paymentMethod,
            appliedDiscount: r.appliedDiscount,
            items: r.items,
            source: r.source || 'kiosk',
            updatedAt: r.updated
        }));
    },

    async getOrder(id: string): Promise<Order> {
        const r = await pb.collection('orders').getOne(id);
        return {
            id: r.id,
            date: r.date,
            clientName: r.clientName,
            email: r.email,
            status: r.status,
            total: r.total,
            photographerId: r.photographerId,
            destinationId: r.destinationId,
            paymentMethod: r.paymentMethod,
            appliedDiscount: r.appliedDiscount,
            items: r.items,
            source: r.source || 'kiosk',
            updatedAt: r.updated
        } as Order;
    },

    async createOrder(data: Partial<Order>): Promise<Order> {
        try {
            const record = await pb.collection('orders').create(data);
            return record as Order;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('Type error');

            if (isNetworkError) {
                logger.warn(`[SyncResilience] Offline detected. Queueing create for Order`);
                const { offlineQueue } = await import('../OfflineQueue');
                
                const tempId = data.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const queuedData = { ...data, id: tempId };
                offlineQueue.enqueue('orders', 'create', queuedData);

                return {
                    ...queuedData,
                    status: data.status || 'Pending',
                    updatedAt: new Date().toISOString()
                } as Order;
            }
            
            logger.error('Failed to create order', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    async updateOrder(id: string, data: Partial<Order>, retryCount = 0): Promise<Order> {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        try {
            if (data.items && Array.isArray(data.items)) {
                const calculatedTotal = data.items.reduce((sum: number, item: any) =>
                    sum + ((item.price || 0) * (item.quantity || 0)), 0);
                const discount = data.appliedDiscount || 0;
                const finalTotal = Math.max(0, calculatedTotal - discount);

                if (data.total !== finalTotal) {
                    data.total = finalTotal;
                }
            }

            const record = await pb.collection('orders').update(id, data);
            return record as Order;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('Type error');

            if (isNetworkError) {
                // STAGE 5: Smart Queueing - Intercept Offline Mutation
                logger.warn(`[SyncResilience] Offline detected. Queueing update for Order ${id}`);

                // Import dynamically to avoid cycle if necessary, or just use global
                const { offlineQueue } = await import('../OfflineQueue');

                offlineQueue.enqueue('orders', 'update', { id, ...data });

                // Return optimistic result
                return {
                    id,
                    ...data,
                    updatedAt: new Date().toISOString()
                } as Order;
            }

            logger.error('Failed to update order', error instanceof Error ? error : undefined, { orderId: id, retryCount });
            throw error;
        }
    },

    async deleteOrder(id: string): Promise<void> {
        await pb.collection('orders').delete(id);
    },

    async finalizeOrderForCustomerDelivery(orderId: string): Promise<Order> {
        const order = await this.updateOrder(orderId, { status: 'Delivered' });
        return order;
    },

    // --- Products ---
    async getProducts(): Promise<Product[]> {
        const records = await pb.collection('products').getFullList();
        return records.map((r: PocketRecord) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            price: r.price,
            stock: r.stock,
            isFeatured: r.isFeatured
        }));
    },

    async createProduct(data: Partial<Product>): Promise<Product> {
        const record = await pb.collection('products').create(data);
        return record as Product;
    },

    async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
        const record = await pb.collection('products').update(id, data);
        return record as Product;
    },

    async deleteProduct(id: string): Promise<void> {
        await pb.collection('products').delete(id);
    },

    // --- Packs ---
    async getPacks(): Promise<Pack[]> {
        const records = await pb.collection('packs').getFullList();
        return records.map((r: PocketRecord) => {
            let products: string[] = [];
            if (r.productsJSON) {
                if (typeof r.productsJSON === 'string') {
                    try {
                        products = JSON.parse(r.productsJSON);
                    } catch {
                        products = [];
                    }
                } else if (Array.isArray(r.productsJSON)) {
                    products = r.productsJSON;
                }
            } else if (r.products && Array.isArray(r.products)) {
                products = r.products;
            }

            return {
                id: r.id,
                name: r.name,
                description: r.description || '',
                price: r.price,
                products: products
            };
        });
    },

    async createPack(data: Partial<Pack>): Promise<Pack> {
        const packData: any = {
            name: data.name,
            description: data.description,
            price: data.price,
            productsJSON: data.products ? JSON.stringify(data.products) : '[]'
        };
        const record = await pb.collection('packs').create(packData);
        return {
            id: record.id,
            name: record.name,
            description: record.description || '',
            price: record.price,
            products: data.products || []
        };
    },

    async updatePack(id: string, data: Partial<Pack>): Promise<Pack> {
        const packData: any = {
            name: data.name,
            description: data.description,
            price: data.price
        };
        if (data.products !== undefined) {
            packData.productsJSON = JSON.stringify(data.products);
        }
        const record = await pb.collection('packs').update(id, packData);

        let products: string[] = [];
        if (record.productsJSON) {
            if (typeof record.productsJSON === 'string') {
                try {
                    products = JSON.parse(record.productsJSON);
                } catch {
                    products = [];
                }
            } else if (Array.isArray(record.productsJSON)) {
                products = record.productsJSON;
            }
        }

        return {
            id: record.id,
            name: record.name,
            description: record.description || '',
            price: record.price,
            products: products
        };
    },

    async deletePack(id: string): Promise<void> {
        await pb.collection('packs').delete(id);
    },

    // --- Bookings ---
    async getBookings(): Promise<Booking[]> {
        const records = await pb.collection('bookings').getFullList();
        return records.map((r: PocketRecord) => ({
            id: r.id,
            date: r.date,
            clientName: r.clientName,
            email: r.email,
            photographerId: r.photographerId,
            sessionType: r.sessionType,
            status: r.status,
            notes: r.notes
        }));
    },

    async createBooking(data: Partial<Booking>): Promise<Booking> {
        try {
            const record = await pb.collection('bookings').create(data);
            return record as Booking;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('Type error');

            if (isNetworkError) {
                logger.warn(`[SyncResilience] Offline detected. Queueing create for Booking`);
                const { offlineQueue } = await import('../OfflineQueue');
                
                const tempId = data.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const queuedData = { ...data, id: tempId };
                offlineQueue.enqueue('bookings', 'create', queuedData);

                return {
                    ...queuedData,
                    status: data.status || 'Pending'
                } as Booking;
            }
            throw error;
        }
    },

    async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
        try {
            const record = await pb.collection('bookings').update(id, data);
            return record as Booking;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isNetworkError = errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('Type error');

            if (isNetworkError) {
                logger.warn(`[SyncResilience] Offline detected. Queueing update for Booking ${id}`);
                const { offlineQueue } = await import('../OfflineQueue');
                
                offlineQueue.enqueue('bookings', 'update', { id, ...data });

                return {
                    id,
                    ...data
                } as Booking;
            }
            throw error;
        }
    },

    async deleteBooking(id: string): Promise<void> {
        await pb.collection('bookings').delete(id);
    }
};
