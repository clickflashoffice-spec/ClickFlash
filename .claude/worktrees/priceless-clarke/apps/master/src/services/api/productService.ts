/**
 * Product Service
 * 
 * Handles all CRUD operations for products
 */

import { pb } from '../pb';
import { PocketRecord } from '../pbTypes';
import { Product } from '../../types';

export const productService = {
    /**
     * Get all products
     */
    async getProducts(): Promise<Product[]> {
        const records = await pb.collection('products').getFullList();
        return records.map((r: PocketRecord) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            price: r.price,
            category: r.category || '',
            type: r.type || 'output'
        }));
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
            console.log(`Stock reduced for ${id}: ${currentStock} -> ${newStock}`);
        } catch (error) {
            console.error(`Failed to reduce stock for product ${id}:`, error);
            throw error;
        }
    }
};

