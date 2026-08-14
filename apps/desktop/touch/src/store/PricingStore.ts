import { create } from 'zustand';
import { CartItem } from '../types';

export interface DiscountRule {
    id: string;
    type: 'percentage' | 'fixed';
    value: number; // For percentage, 0.1 = 10%
    minItems?: number;
    code?: string;
    description: string;
}

interface PricingState {
    discountCode: string;
    activeRules: DiscountRule[];
    
    setDiscountCode: (code: string) => void;
    calculateTotals: (cart: CartItem[]) => { 
        subtotal: number; 
        discount: number; 
        total: number;
        appliedRule: DiscountRule | null;
    };
}

export const usePricingStore = create<PricingState>((set, get) => ({
    discountCode: '',
    activeRules: [
        {
            id: 'SAVE10',
            type: 'percentage',
            value: 0.1,
            code: 'SAVE10',
            description: '10% off your entire order (Promo)'
        },
        {
            id: 'BULK_5',
            type: 'percentage',
            value: 0.2,
            minItems: 5,
            description: '20% Bulk Discount (5+ items)'
        },
        {
            id: 'BULK_10',
            type: 'percentage',
            value: 0.3,
            minItems: 10,
            description: '30% Mega Bulk Discount (10+ items)'
        }
    ],

    setDiscountCode: (code: string) => set({ discountCode: code }),

    calculateTotals: (cart: CartItem[]) => {
        const { activeRules, discountCode } = get();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

        let bestDiscount = 0;
        let appliedRule: DiscountRule | null = null;

        activeRules.forEach(rule => {
            let applicable = false;
            
            // Promo code rule
            if (rule.code && rule.code.toUpperCase() === discountCode.toUpperCase()) {
                applicable = true;
            }
            // Auto bulk rule (only if no code is required)
            if (rule.minItems && itemCount >= rule.minItems && !rule.code) {
                applicable = true;
            }

            if (applicable) {
                let currentDiscount = 0;
                if (rule.type === 'percentage') {
                    currentDiscount = subtotal * rule.value;
                } else if (rule.type === 'fixed') {
                    currentDiscount = rule.value;
                }

                if (currentDiscount > bestDiscount) {
                    bestDiscount = currentDiscount;
                    appliedRule = rule;
                }
            }
        });

        return {
            subtotal,
            discount: bestDiscount,
            total: Math.max(0, subtotal - bestDiscount),
            appliedRule
        };
    }
}));
