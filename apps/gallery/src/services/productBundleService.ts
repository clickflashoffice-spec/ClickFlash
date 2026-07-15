import { logger } from '@clickflash/logger';
/**
 * Product Bundle Service
 * Manages product packages, bulk discounts, and combo deals
 */

import { EventEmitter } from 'events';
import { Product, Photo, CartItem } from '../types';

interface BundleProduct {
  productId: string;
  quantity: number; photoId?: string; name?: string;
  optional?: boolean;
}

interface ProductBundle {
  id: string;
  name: string;
  description: string;
  products: BundleProduct[];
  discountType: 'percent' | 'fixed' | 'auto'; // auto = calculated from individual prices
  discountValue: number;
  coverImage?: string;
  tags: string[];
  isActive: boolean;
  minPhotosRequired?: number;
  maxPhotosAllowed?: number;
  createdAt: Date;
  timesPurchased: number;
}

interface BundlePriceBreakdown {
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  savingsPercentage: number;
  perItemPrice: number;
}

interface AppliedBundle {
  bundle: ProductBundle;
  photos: Photo[];
  totalPrice: number;
  savings: number;
}

class ProductBundleService extends EventEmitter {
  private bundles: Map<string, ProductBundle> = new Map();
  private products: Map<string, Product> = new Map();

  constructor() {
    super();
    this.initializeDefaultBundles();
  }

  /**
   * Initialize default bundles
   */
  private initializeDefaultBundles(): void {
    const defaultBundles: ProductBundle[] = [
      {
        id: 'bundle_starter',
        name: 'Digital Starter Pack',
        description: '5 digital photos at a great price',
        products: [{ productId: 'prod_digital', quantity: 5 }],
        discountType: 'percent',
        discountValue: 20,
        tags: ['digital', 'starter', 'popular'],
        isActive: true,
        minPhotosRequired: 5,
        maxPhotosAllowed: 5,
        createdAt: new Date(),
        timesPurchased: 0
      },
      {
        id: 'bundle_family',
        name: 'Family Memories Pack',
        description: '10 prints + digital copies + canvas frame',
        products: [
          { productId: 'prod_print_10x15', quantity: 10 },
          { productId: 'prod_digital', quantity: 10 },
          { productId: 'prod_canvas', quantity: 1 }
        ],
        discountType: 'percent',
        discountValue: 25,
        tags: ['family', 'prints', 'canvas', 'best-value'],
        isActive: true,
        minPhotosRequired: 10,
        maxPhotosAllowed: 10,
        createdAt: new Date(),
        timesPurchased: 0
      },
      {
        id: 'bundle_complete',
        name: 'Complete Collection',
        description: 'All photos from your session - USB + digital + prints',
        products: [
          { productId: 'prod_usb_all', quantity: 1 },
          { productId: 'prod_digital', quantity: 1 }, // Unlimited
          { productId: 'prod_print_20x30', quantity: 3 }
        ],
        discountType: 'fixed',
        discountValue: 50,
        tags: ['complete', 'usb', 'premium'],
        isActive: true,
        minPhotosRequired: 1,
        createdAt: new Date(),
        timesPurchased: 0
      },
      {
        id: 'bundle_social',
        name: 'Social Media Pack',
        description: '20 digital photos optimized for social sharing',
        products: [{ productId: 'prod_digital', quantity: 20 }],
        discountType: 'percent',
        discountValue: 30,
        tags: ['digital', 'social', 'bulk'],
        isActive: true,
        minPhotosRequired: 20,
        maxPhotosAllowed: 20,
        createdAt: new Date(),
        timesPurchased: 0
      },
      {
        id: 'bundle_gift',
        name: 'Gift Set',
        description: '3 framed prints + 5 digital photos + greeting card',
        products: [
          { productId: 'prod_framed', quantity: 3 },
          { productId: 'prod_digital', quantity: 5 },
          { productId: 'prod_card', quantity: 1, optional: true }
        ],
        discountType: 'percent',
        discountValue: 15,
        tags: ['gift', 'framed', 'special'],
        isActive: true,
        minPhotosRequired: 3,
        maxPhotosAllowed: 8,
        createdAt: new Date(),
        timesPurchased: 0
      }
    ];

    defaultBundles.forEach(bundle => this.bundles.set(bundle.id, bundle));
  }

  /**
   * Set available products for price calculations
   */
  setProducts(products: Product[]): void {
    this.products.clear();
    products.forEach(p => this.products.set(p.id, p));
  }

  /**
   * Get all active bundles
   */
  getActiveBundles(): ProductBundle[] {
    return Array.from(this.bundles.values())
      .filter(b => b.isActive)
      .sort((a, b) => b.timesPurchased - a.timesPurchased);
  }

  /**
   * Get bundles by tag
   */
  getBundlesByTag(tag: string): ProductBundle[] {
    return this.getActiveBundles().filter(b => b.tags.includes(tag));
  }

  /**
   * Get bundle by ID
   */
  getBundle(id: string): ProductBundle | undefined {
    return this.bundles.get(id);
  }

  /**
   * Calculate bundle price breakdown
   */
  calculateBundlePrice(bundle: ProductBundle): BundlePriceBreakdown {
    // Calculate original price
    let originalPrice = 0;
    bundle.products.forEach(bp => {
      const product = this.products.get(bp.productId);
      if (product) {
        originalPrice += product.price * bp.quantity;
      }
    });

    // Calculate bundle price
    let bundlePrice: number;
    if (bundle.discountType === 'percent') {
      bundlePrice = originalPrice * (1 - bundle.discountValue / 100);
    } else if (bundle.discountType === 'fixed') {
      bundlePrice = Math.max(0, originalPrice - bundle.discountValue);
    } else {
      // Auto - use preset bundle price
      bundlePrice = originalPrice * 0.8; // 20% off default
    }

    const totalQuantity = bundle.products.reduce((sum, p) => sum + p.quantity, 0);

    return {
      originalPrice: Math.round(originalPrice * 100) / 100,
      bundlePrice: Math.round(bundlePrice * 100) / 100,
      savings: Math.round((originalPrice - bundlePrice) * 100) / 100,
      savingsPercentage: Math.round(((originalPrice - bundlePrice) / originalPrice) * 100),
      perItemPrice: Math.round((bundlePrice / totalQuantity) * 100) / 100
    };
  }

  /**
   * Check if customer photos match bundle requirements
   */
  validateBundleForPhotos(bundle: ProductBundle, selectedPhotos: Photo[]): {
    valid: boolean;
    missingPhotos: number;
    message: string;
  } {
    const photoCount = selectedPhotos.length;
    
    if (bundle.minPhotosRequired && photoCount < bundle.minPhotosRequired) {
      return {
        valid: false,
        missingPhotos: bundle.minPhotosRequired - photoCount,
        message: `Select ${bundle.minPhotosRequired - photoCount} more photo${bundle.minPhotosRequired - photoCount > 1 ? 's' : ''}`
      };
    }

    if (bundle.maxPhotosAllowed && photoCount > bundle.maxPhotosAllowed) {
      return {
        valid: false,
        missingPhotos: 0,
        message: `Maximum ${bundle.maxPhotosAllowed} photos allowed for this bundle`
      };
    }

    return {
      valid: true,
      missingPhotos: 0,
      message: 'Bundle requirements met'
    };
  }

  /**
   * Apply bundle to cart
   */
  applyBundle(
    bundle: ProductBundle,
    selectedPhotos: Photo[]
  ): { success: boolean; items?: CartItem[]; error?: string } {
    const validation = this.validateBundleForPhotos(bundle, selectedPhotos);
    if (!validation.valid) {
      return { success: false, error: validation.message };
    }

    const priceBreakdown = this.calculateBundlePrice(bundle);
    const pricePerPhoto = priceBreakdown.bundlePrice / selectedPhotos.length;

    // Create cart items
    const items: CartItem[] = selectedPhotos.map((photo, index) => {
      // Assign products based on bundle configuration
      const bundleProduct = bundle.products[index % bundle.products.length];
      const product = this.products.get(bundleProduct.productId);

      return {
        id: `bundle_${bundle.id}_${photo.id}`,
        photo,
        photoId: photo.id,
        name: product?.name || 'Bundle Item',
        product: product || { id: 'unknown', name: 'Bundle Item', category: 'Other', price: pricePerPhoto, stock: 999 },
        quantity: 1,
        size: 'Bundle',
        price: pricePerPhoto,
        mode: 'Normal'
      };
    });

    // Increment purchase counter
    bundle.timesPurchased++;
    this.emit('bundle:applied', bundle, selectedPhotos);

    return { success: true, items };
  }

  /**
   * Create custom bundle
   */
  createBundle(bundle: Omit<ProductBundle, 'id' | 'createdAt' | 'timesPurchased'>): ProductBundle {
    const newBundle: ProductBundle = {
      ...bundle,
      id: `bundle_custom_${Date.now()}`,
      createdAt: new Date(),
      timesPurchased: 0
    };

    this.bundles.set(newBundle.id, newBundle);
    this.emit('bundle:created', newBundle);

    return newBundle;
  }

  /**
   * Update bundle
   */
  updateBundle(id: string, updates: Partial<ProductBundle>): boolean {
    const bundle = this.bundles.get(id);
    if (!bundle) return false;

    Object.assign(bundle, updates);
    this.emit('bundle:updated', bundle);
    return true;
  }

  /**
   * Delete bundle
   */
  deleteBundle(id: string): boolean {
    const bundle = this.bundles.get(id);
    if (!bundle) return false;

    this.bundles.delete(id);
    this.emit('bundle:deleted', bundle);
    return true;
  }

  /**
   * Get recommended bundles for customer
   */
  getRecommendedBundles(photoCount: number, cartTotal: number): ProductBundle[] {
    return this.getActiveBundles().filter(bundle => {
      // Filter by photo count
      if (bundle.minPhotosRequired && photoCount < bundle.minPhotosRequired) return false;
      if (bundle.maxPhotosAllowed && photoCount > bundle.maxPhotosAllowed) return false;

      // Filter by price (bundle should offer savings)
      const priceBreakdown = this.calculateBundlePrice(bundle);
      return priceBreakdown.savings > 0;
    }).slice(0, 3); // Top 3 recommendations
  }

  /**
   * Calculate savings if customer switches to bundle
   */
  calculateSavingsVsIndividual(
    bundle: ProductBundle,
    currentCartItems: CartItem[]
  ): {
    currentTotal: number;
    bundleTotal: number;
    savings: number;
    shouldSwitch: boolean;
  } {
    const currentTotal = currentCartItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    const priceBreakdown = this.calculateBundlePrice(bundle);

    return {
      currentTotal,
      bundleTotal: priceBreakdown.bundlePrice,
      savings: priceBreakdown.savings,
      shouldSwitch: priceBreakdown.bundlePrice < currentTotal
    };
  }

  /**
   * Get bundle statistics
   */
  getBundleStats(): {
    totalBundles: number;
    activeBundles: number;
    mostPopular: ProductBundle | null;
    totalRevenue: number;
  } {
    const allBundles = Array.from(this.bundles.values());
    const activeBundles = allBundles.filter(b => b.isActive);
    const mostPopular = allBundles.sort((a, b) => b.timesPurchased - a.timesPurchased)[0] || null;

    // Calculate approximate revenue
    const totalRevenue = allBundles.reduce((sum, bundle) => {
      const priceBreakdown = this.calculateBundlePrice(bundle);
      return sum + (priceBreakdown.bundlePrice * bundle.timesPurchased);
    }, 0);

    return {
      totalBundles: allBundles.length,
      activeBundles: activeBundles.length,
      mostPopular,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    };
  }

  /**
   * Export bundle for sharing
   */
  exportBundle(bundleId: string): string | null {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) return null;

    return btoa(JSON.stringify({
      type: 'bundle',
      data: bundle,
      exportedAt: new Date().toISOString()
    }));
  }

  /**
   * Import bundle from code
   */
  importBundle(code: string): ProductBundle | null {
    try {
      const parsed = JSON.parse(atob(code));
      if (parsed.type === 'bundle' && parsed.data) {
        const bundle = parsed.data as ProductBundle;
        bundle.id = `bundle_imported_${Date.now()}`;
        bundle.timesPurchased = 0;
        bundle.createdAt = new Date();
        this.bundles.set(bundle.id, bundle);
        return bundle;
      }
    } catch (error) {
      logger.error('Failed to import bundle:', error);
    }
    return null;
  }
}

// Export singleton
export const productBundleService = new ProductBundleService();
export type { ProductBundle, BundleProduct, BundlePriceBreakdown, AppliedBundle };
