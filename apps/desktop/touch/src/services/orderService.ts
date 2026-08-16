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
     * Create an order directly on the Master via HTTP API (Zero-Config)
     */
    async createOrder(params: CreateOrderParams): Promise<{ id: string, magicLinkUrl?: string }> {
        try {
            const clientMutationId = `KIOSK-${Date.now().toString().slice(-6)}`;
            
            // 1. Prepare data for backend API
            const orderData = {
                clientMutationId,
                clientDeviceId: 'TOUCH_KIOSK', // Ideally from config
                clientName: params.clientName,
                email: params.email,
                total: params.total,
                status: 'Pending',
                items: params.items,
                date: new Date().toISOString().split('T')[0],
                destinationId: params.destinationId,
                photographerId: params.photographerId,
                roomNumber: params.roomNumber || '',
                appliedDiscount: params.appliedDiscount || 0
            };

            logger.info("Creating order via Master API...", { tempId: clientMutationId, data: orderData });

            // 2. Send to Master's /api/orders endpoint
            const response = await fetch(`${pb.baseUrl}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Master API rejected order: ${response.status} ${response.statusText} ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            const createdId = data.id;
            const magicLinkUrl = data.magicLinkUrl;

            logger.info("Order successfully created on Master", { id: createdId });

            return { id: createdId, magicLinkUrl };

        } catch (error) {
            logger.error("Failed to create order on Master", error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
};
