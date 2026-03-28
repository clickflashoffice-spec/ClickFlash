import { pb } from './pb';
import { logger } from '../utils/logger';
import { OrderItem } from '../types';

export interface CreateOrderParams {
    clientName: string;
    email: string;
    total: number;
    items: OrderItem[];
    destinationId: string;
    photographerId: number;
    roomNumber?: string;
    appliedDiscount?: number;
}

export const orderService = {
    /**
     * Create an order in the local database and immediately export it to Master
     */
    async createOrder(params: CreateOrderParams): Promise<string> {
        const orderId = `KIOSK-${Date.now().toString().slice(-6)}`;

        try {
            // 1. Prepare data for PocketBase
            // Must match backend validation schema exactly
            const orderData = {
                clientName: params.clientName,
                email: params.email,
                total: params.total,
                status: 'Pending',
                items: params.items, // Backend expects array, not string
                date: new Date().toISOString().split('T')[0], // Backend expects string YYYY-MM-DD
                destinationId: params.destinationId,
                photographerId: params.photographerId,
                roomNumber: params.roomNumber || '',
                appliedDiscount: params.appliedDiscount || 0
            };

            logger.info("Creating order...", { tempId: orderId, data: orderData });

            // 2. Create in Local Database
            const record = await pb.collection('orders').create(orderData);
            const createdId = record.id;

            logger.info("Order created in DB", { id: createdId });

            // 3. Export to Master (Critical Step)
            // This creates the folder that Master monitors
            try {
                const exportResponse = await fetch(`${pb.baseUrl}/api/orders/${createdId}/export-to-master`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!exportResponse.ok) {
                    throw new Error(`Export failed: ${exportResponse.status} ${exportResponse.statusText}`);
                }

                logger.info("Order exported to Master", { id: createdId });

            } catch (exportError) {
                logger.error("Failed to export order to Master", exportError instanceof Error ? exportError : new Error(String(exportError)));
                // We don't throw here because the order IS saved locally, 
                // and the sync service might pick it up later.
            }

            return createdId;

        } catch (error) {
            logger.error("Failed to create order", error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
};
