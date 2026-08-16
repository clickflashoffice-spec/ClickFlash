/**
 * Pack Service
 * 
 * Handles all CRUD operations for packs
 */

import { pb } from '../pb';
import { Pack } from '../../types';
import { PocketRecord } from '../pbTypes';
import { yieldPricingService } from '@clickflash/utils';
import type { YieldPricingConfig } from '@clickflash/types';

export const packService = {
    /**
     * Get all packs
     */
    async getPacks(): Promise<Pack[]> {
        const records = await pb.collection('packs').getFullList();

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
            // Handle products field - it might be stored as JSON string or array
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

            const basePrice = Number(r.price) || 0;
            const dynamicPrice = Math.round((basePrice * yieldMultiplier) * 100) / 100;

            return {
                id: r.id,
                name: r.name,
                description: r.description || '',
                price: dynamicPrice,
                products: products,
                basePrice: basePrice,
                yieldMultiplier: yieldMultiplier
            };
        });
    },

    /**
     * Create a new pack
     */
    async createPack(data: Partial<Pack>): Promise<Pack> {
        // Convert products array to JSON format for storage
        const packData: Record<string, unknown> = {
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

    /**
     * Update an existing pack
     */
    async updatePack(id: string, data: Partial<Pack>): Promise<Pack> {
        // Convert products array to JSON format for storage
        const packData: Record<string, unknown> = {
            name: data.name,
            description: data.description,
            price: data.price
        };
        if (data.products !== undefined) {
            packData.productsJSON = JSON.stringify(data.products);
        }
        const record = await pb.collection('packs').update(id, packData);

        // Parse products back from JSON
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

    /**
     * Delete a pack
     */
    async deletePack(id: string): Promise<void> {
        await pb.collection('packs').delete(id);
    }
};

