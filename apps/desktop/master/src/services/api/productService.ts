/**
 * Product Service
 * 
 * Handles all CRUD operations for products
 */

import { pb } from '../pb';
import { PocketRecord } from '../pbTypes';
import { Product } from '../../types';
import { logger } from '@/utils/logger';
import { yieldPricingService } from '@clickflash/utils';
import type { YieldPricingConfig } from '@clickflash/types';

export const productService = {
    /**
     * Get all products
     */
    async getProducts(): Promise<Product[]> {
        const records = await pb.collection('products').getFullList();

        const dummyConfig: YieldPricingConfig = {
            destinationId: 'default',
            basePrice: 1.0,
            minPrice: 0.5,
            maxPrice: 2.0,
            algorithm: 'surge',
            rules: {
                crowdDensityMultiplier: { 'High': 1.15, 'Low': 0.90 }
            },
            isActive: true
        };
        const yieldMultiplier = yieldPricingService.evaluateYield(dummyConfig, { crowdDensity: 'Medium' });

        return records.map((r: PocketRecord) => {
            const basePrice = Number(r.price) || 0;
            const dynamicPrice = Math.round((basePrice * yieldMultiplier) * 100) / 100;
            return {
                id: r.id,
                name: r.name,
                description: r.description || '',
                price: dynamicPrice,
                category: r.category || '',
                type: r.type || 'output',
                basePrice: basePrice,
                yieldMultiplier: yieldMultiplier
            };
        });
    },

    /**
     * Create a new product
     */
    async createProduct(data: Partial<Product>): Promise<Product> {
        const record = await pb.collection('products').create(data);
        return record as Product;
    },

    /**
     * Update an existing product
     */
    async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
        const record = await pb.collection('products').update(id, data);
        return record as Product;
    },

    /**
     * Delete a product
     */
    async deleteProduct(id: string): Promise<void> {
        await pb.collection('products').delete(id);
    },

    /**
     * Reduce stock for a product
     */
    async reduceStock(id: string, amount: number): Promise<void> {
        try {
            const product = await pb.collection('products').getOne(id);
            const currentStock = product.stock ?? 0;

            // 9999 represents unlimited stock
            if (currentStock === 9999) return;

            const newStock = Math.max(0, currentStock - amount);
            await pb.collection('products').update(id, { stock: newStock });
            logger.info(`Stock reduced for ${id}: ${currentStock} -> ${newStock}`);
        } catch (error) {
            logger.error(`Failed to reduce stock for product ${id}:`, error);
            throw error;
        }
    }
};

