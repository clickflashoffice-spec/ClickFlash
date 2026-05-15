/**
 * Advanced Checkout Service
 * Handles tax calculation, shipping, and complex checkout flows
 */

import { EventEmitter } from 'events';
import { CartItem as BaseCartItem, Order, Product, Photo } from '../types';

/**
 * Extended CartItem for checkout flows that includes product metadata.
 * The base CartItem only has `photo`; checkout operations also need
 * `product` and an optional `size` for order-line generation.
 */
interface CartItem extends BaseCartItem {
  product: Product;
}

interface TaxRate {
  country: string;
  region?: string;
  rate: number;
  name: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  perItemCost: number;
  estimatedDays: string;
  tracking: boolean;
}

interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface CheckoutBreakdown {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  taxName: string;
  shippingCost: number;
  shippingMethod: ShippingMethod | null;
  discountAmount: number;
  discountCode: string | null;
  total: number;
  currency: string;
}

interface PromoCode {
  code: string;
  type: 'percent' | 'fixed' | 'bogo' | 'free_shipping';
  value: number;
  minOrderValue?: number;
  maxDiscount?: number;
  appliesTo?: 'all' | 'prints' | 'digital' | 'merchandise';
  expiresAt?: Date;
  usageLimit?: number;
  usageCount: number;
}

class AdvancedCheckoutService extends EventEmitter {
  private taxRates: TaxRate[] = [
    { country: 'US', region: 'CA', rate: 0.0975, name: 'Sales Tax' },
    { country: 'US', region: 'NY', rate: 0.08, name: 'Sales Tax' },
    { country: 'US', rate: 0.06, name: 'Sales Tax' },
    { country: 'CA', rate: 0.13, name: 'HST' },
    { country: 'GB', rate: 0.20, name: 'VAT' },
    { country: 'EU', rate: 0.21, name: 'VAT' },
    { country: '*', rate: 0, name: 'Tax' }
  ];

  private shippingMethods: ShippingMethod[] = [
    {
      id: 'digital',
      name: 'Digital Download',
      description: 'Instant access to digital files',
      baseCost: 0,
      perItemCost: 0,
      estimatedDays: 'Immediate',
      tracking: false
    },
    {
      id: 'standard',
      name: 'Standard Shipping',
      description: '5-7 business days',
      baseCost: 5.99,
      perItemCost: 0.50,
      estimatedDays: '5-7 days',
      tracking: true
    },
    {
      id: 'express',
      name: 'Express Shipping',
      description: '2-3 business days',
      baseCost: 12.99,
      perItemCost: 1.00,
      estimatedDays: '2-3 days',
      tracking: true
    },
    {
      id: 'overnight',
      name: 'Overnight Delivery',
      description: 'Next business day',
      baseCost: 24.99,
      perItemCost: 2.00,
      estimatedDays: '1 day',
      tracking: true
    }
  ];

  private promoCodes: Map<string, PromoCode> = new Map();

  constructor() {
    super();
    this.loadPromoCodes();
  }

  /**
   * Load promo codes from storage/API
   */
  private loadPromoCodes(): void {
    // Default promo codes
    const defaultCodes: PromoCode[] = [
      { code: 'SAVE10', type: 'percent', value: 10, usageCount: 0 },
      { code: 'SAVE20', type: 'percent', value: 20, minOrderValue: 50, usageCount: 0 },
      { code: 'FLASH50', type: 'percent', value: 50, maxDiscount: 100, appliesTo: 'prints', usageCount: 0 },
      { code: '5OFF', type: 'fixed', value: 5, usageCount: 0 },
      { code: 'FREESHIP', type: 'free_shipping', value: 0, minOrderValue: 75, usageCount: 0 },
      { code: 'BUNDLE25', type: 'percent', value: 25, appliesTo: 'all', minOrderValue: 100, usageCount: 0 }
    ];

    defaultCodes.forEach(code => this.promoCodes.set(code.code, code));
  }

  /**
   * Calculate tax based on address
   */
  calculateTax(subtotal: number, address: ShippingAddress): { amount: number; rate: number; name: string } {
    const rate = this.getTaxRate(address.country, address.state);
    return {
      amount: Math.round(subtotal * rate.rate * 100) / 100,
      rate: rate.rate,
      name: rate.name
    };
  }

  /**
   * Get tax rate for location
   */
  private getTaxRate(country: string, region?: string): TaxRate {
    // Try specific region first
    if (region) {
      const regional = this.taxRates.find(r => 
        r.country === country && r.region === region
      );
      if (regional) return regional;
    }

    // Try country
    const national = this.taxRates.find(r => 
      r.country === country && !r.region
    );
    if (national) return national;

    // Default to no tax
    return this.taxRates.find(r => r.country === '*') || { country: '*', rate: 0, name: 'Tax' };
  }

  /**
   * Calculate shipping cost
   */
  calculateShipping(
    items: CartItem[],
    method: ShippingMethod,
    address?: ShippingAddress
  ): number {
    // Check if all items are digital
    const allDigital = items.every(item => item.product.category === 'Digital');
    if (allDigital) {
      return 0; // Free shipping for digital-only orders
    }

    // Count physical items
    const physicalItemCount = items.filter(item => 
      item.product.category !== 'Digital'
    ).reduce((sum, item) => sum + item.quantity, 0);

    // Calculate cost
    let cost = method.baseCost;
    cost += method.perItemCost * physicalItemCount;

    // International surcharge
    if (address && address.country !== 'US') {
      cost += 10; // International shipping surcharge
    }

    return Math.round(cost * 100) / 100;
  }

  /**
   * Get available shipping methods
   */
  getShippingMethods(items: CartItem[], address?: ShippingAddress): ShippingMethod[] {
    const allDigital = items.every(item => item.product.category === 'Digital');

    if (allDigital) {
      // Only digital download for digital-only orders
      return [this.shippingMethods.find(m => m.id === 'digital')!];
    }

    // Return physical shipping methods
    return this.shippingMethods.filter(m => m.id !== 'digital');
  }

  /**
   * Validate and apply promo code
   */
  validatePromoCode(code: string, items: CartItem[], subtotal: number): {
    valid: boolean;
    discount: number;
    message: string;
    code: PromoCode | null;
  } {
    const upperCode = code.toUpperCase();
    const promo = this.promoCodes.get(upperCode);

    if (!promo) {
      return { valid: false, discount: 0, message: 'Invalid promo code', code: null };
    }

    // Check expiration
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return { valid: false, discount: 0, message: 'Promo code has expired', code: null };
    }

    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return { valid: false, discount: 0, message: 'Promo code usage limit reached', code: null };
    }

    // Check minimum order value
    if (promo.minOrderValue && subtotal < promo.minOrderValue) {
      return { 
        valid: false, 
        discount: 0, 
        message: `Minimum order value of $${promo.minOrderValue} required`,
        code: null 
      };
    }

    // Check applies to
    if (promo.appliesTo && promo.appliesTo !== 'all') {
      const applicableItems = items.filter(item => {
        if (promo.appliesTo === 'prints') return item.product.category === 'Print';
        if (promo.appliesTo === 'digital') return item.product.category === 'Digital';
        if (promo.appliesTo === 'merchandise') return item.product.category === 'Merchandise';
        return true;
      });

      if (applicableItems.length === 0) {
        return { 
          valid: false, 
          discount: 0, 
          message: `Code not valid for ${promo.appliesTo} items`,
          code: null 
        };
      }
    }

    // Calculate discount
    let discount = 0;
    let message = '';

    switch (promo.type) {
      case 'percent':
        discount = subtotal * (promo.value / 100);
        if (promo.maxDiscount && discount > promo.maxDiscount) {
          discount = promo.maxDiscount;
        }
        message = `${promo.value}% discount applied${promo.maxDiscount ? ` (max $${promo.maxDiscount})` : ''}`;
        break;

      case 'fixed':
        discount = Math.min(promo.value, subtotal);
        message = `$${promo.value} discount applied`;
        break;

      case 'free_shipping':
        discount = 0; // Will be applied to shipping separately
        message = 'Free shipping applied';
        break;

      case 'bogo':
        // Buy one get one free - complex calculation
        discount = this.calculateBogoDiscount(items);
        message = 'Buy one get one free applied';
        break;
    }

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      message,
      code: promo
    };
  }

  /**
   * Calculate BOGO discount
   */
  private calculateBogoDiscount(items: CartItem[]): number {
    let discount = 0;
    const eligibleItems = items.filter(item => item.quantity >= 2);
    
    eligibleItems.forEach(item => {
      const freeItems = Math.floor(item.quantity / 2);
      discount += freeItems * item.price;
    });

    return discount;
  }

  /**
   * Calculate complete checkout breakdown
   */
  calculateCheckout(
    items: CartItem[],
    address: ShippingAddress,
    shippingMethodId: string,
    promoCode?: string
  ): CheckoutBreakdown {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate tax
    const tax = this.calculateTax(subtotal, address);
    
    // Get shipping method and cost
    const shippingMethod = this.shippingMethods.find(m => m.id === shippingMethodId) || null;
    let shippingCost = 0;
    if (shippingMethod) {
      shippingCost = this.calculateShipping(items, shippingMethod, address);
    }

    // Apply promo code
    let discountAmount = 0;
    let validPromoCode: string | null = null;
    
    if (promoCode) {
      const validation = this.validatePromoCode(promoCode, items, subtotal);
      if (validation.valid && validation.code) {
        discountAmount = validation.discount;
        validPromoCode = promoCode;

        // Handle free shipping
        if (validation.code.type === 'free_shipping') {
          shippingCost = 0;
        }
      }
    }

    // Calculate total
    const total = subtotal + tax.amount + shippingCost - discountAmount;

    return {
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: tax.amount,
      taxRate: tax.rate,
      taxName: tax.name,
      shippingCost: Math.round(shippingCost * 100) / 100,
      shippingMethod,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountCode: validPromoCode,
      total: Math.max(0, Math.round(total * 100) / 100),
      currency: 'USD'
    };
  }

  /**
   * Validate shipping address
   */
  validateAddress(address: ShippingAddress): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address.name || address.name.length < 2) {
      errors.push('Name is required');
    }
    if (!address.line1) {
      errors.push('Address line 1 is required');
    }
    if (!address.city) {
      errors.push('City is required');
    }
    if (!address.state) {
      errors.push('State/Region is required');
    }
    if (!address.postalCode) {
      errors.push('Postal code is required');
    }
    if (!address.country) {
      errors.push('Country is required');
    }

    // Phone validation (optional but recommended)
    if (address.phone && !this.isValidPhone(address.phone)) {
      errors.push('Invalid phone number format');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Basic phone validation
   */
  private isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Create order from checkout
   */
  async createOrder(breakdown: CheckoutBreakdown, customerInfo: {
    email: string;
    name: string;
    phone?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const order: Order = {
        id: orderId,
        date: new Date().toISOString().split('T')[0],
        clientName: customerInfo.name,
        email: customerInfo.email,
        status: 'Pending',
        total: breakdown.total,
        photographerId: 0,
        items: breakdown.items.map(item => ({
          id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: item.product.name,
          format: item.size || 'Standard',
          quantity: item.quantity,
          price: item.price,
          photo: item.photo
        })),
        appliedDiscount: breakdown.discountAmount,
        paymentMethod: 'Card'
      };

      // Emit order created event
      this.emit('order:created', order);

      return { success: true, order };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create order'
      };
    }
  }

  /**
   * Get estimated delivery date
   */
  getEstimatedDelivery(shippingMethod: ShippingMethod): Date {
    const days = parseInt(shippingMethod.estimatedDays) || 5;
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + days);
    return delivery;
  }

  /**
   * Add custom promo code
   */
  addPromoCode(code: PromoCode): void {
    this.promoCodes.set(code.code, code);
  }

  /**
   * Remove promo code
   */
  removePromoCode(code: string): boolean {
    return this.promoCodes.delete(code);
  }
}

// Export singleton
export const advancedCheckout = new AdvancedCheckoutService();
export type {
  TaxRate,
  ShippingMethod,
  ShippingAddress,
  CheckoutBreakdown,
  PromoCode
};
