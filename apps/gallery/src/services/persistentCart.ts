/**
 * Persistent Cart Service
 * Manages shopping cart with localStorage persistence and cross-tab sync
 */

import { EventEmitter } from 'events';
import { Photo, Product, CartItem } from '../types';

interface CartState {
  items: CartItem[];
  lastModified: number;
  sessionId: string;
}

interface CartTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  itemCount: number;
}

interface SavedCart {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: Date;
  total: number;
}

const STORAGE_KEY = 'clickflash_cart_v2';
const SESSION_KEY = 'clickflash_cart_session';

class PersistentCartService extends EventEmitter {
  private items: CartItem[] = [];
  private sessionId: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    super();
    this.sessionId = this.getOrCreateSession();
    this.loadFromStorage();
    this.setupStorageSync();
  }

  /**
   * Get or create session ID
   */
  private getOrCreateSession(): string {
    let session = localStorage.getItem(SESSION_KEY);
    if (!session) {
      session = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, session);
    }
    return session;
  }

  /**
   * Load cart from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: CartState = JSON.parse(stored);
        // Only load if same session or within 7 days
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (Date.now() - parsed.lastModified < maxAge) {
          this.items = parsed.items || [];
          this.emit('cart:loaded', this.items);
        }
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  }

  /**
   * Save cart to localStorage with debouncing
   */
  private saveToStorage(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        const state: CartState = {
          items: this.items,
          lastModified: Date.now(),
          sessionId: this.sessionId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        this.emit('cart:saved', this.items);
      } catch (error) {
        console.error('Failed to save cart:', error);
      }
    }, 300); // Debounce 300ms
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupStorageSync(): void {
    this.storageListener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed: CartState = JSON.parse(e.newValue);
          // Only sync if different session (another tab)
          if (parsed.sessionId !== this.sessionId) {
            this.items = parsed.items || [];
            this.emit('cart:sync', this.items);
          }
        } catch (error) {
          console.error('Failed to sync cart:', error);
        }
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  /**
   * Add item to cart
   */
  addItem(item: Omit<CartItem, 'id'>): CartItem {
    const newItem: CartItem = {
      ...item,
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Check for duplicates
    const existingIndex = this.items.findIndex(i => 
      i.photo.id === item.photo.id && i.product.id === item.product.id
    );

    if (existingIndex >= 0) {
      // Update quantity instead of adding new
      this.items[existingIndex].quantity += item.quantity;
    } else {
      this.items.push(newItem);
    }

    this.saveToStorage();
    this.emit('cart:updated', this.items);
    this.emit('item:added', newItem);

    return newItem;
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId: string): boolean {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index >= 0) {
      const removed = this.items.splice(index, 1)[0];
      this.saveToStorage();
      this.emit('cart:updated', this.items);
      this.emit('item:removed', removed);
      return true;
    }
    return false;
  }

  /**
   * Update item quantity
   */
  updateQuantity(itemId: string, quantity: number): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;

    if (quantity <= 0) {
      return this.removeItem(itemId);
    }

    item.quantity = quantity;
    this.saveToStorage();
    this.emit('cart:updated', this.items);
    this.emit('item:updated', item);

    return true;
  }

  /**
   * Update item product/size
   */
  updateItemProduct(itemId: string, updates: Partial<CartItem>): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;

    Object.assign(item, updates);
    this.saveToStorage();
    this.emit('cart:updated', this.items);
    this.emit('item:updated', item);

    return true;
  }

  /**
   * Get all items
   */
  getItems(): CartItem[] {
    return [...this.items];
  }

  /**
   * Get item count
   */
  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get cart totals
   */
  getTotals(taxRate: number = 0, shippingCost: number = 0, discount: number = 0): CartTotals {
    const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax + shippingCost - discount;

    return {
      subtotal,
      tax,
      shipping: shippingCost,
      discount,
      total: Math.max(0, total),
      itemCount: this.getItemCount()
    };
  }

  /**
   * Clear cart
   */
  clearCart(): void {
    this.items = [];
    this.saveToStorage();
    this.emit('cart:cleared');
    this.emit('cart:updated', []);
  }

  /**
   * Save cart for later
   */
  saveCartForLater(name: string): SavedCart {
    const savedCart: SavedCart = {
      id: `saved_${Date.now()}`,
      name,
      items: [...this.items],
      createdAt: new Date(),
      total: this.getTotals().subtotal
    };

    // Get existing saved carts
    const savedKey = 'clickflash_saved_carts';
    const existing = JSON.parse(localStorage.getItem(savedKey) || '[]');
    existing.push(savedCart);
    
    // Keep only last 10 saved carts
    if (existing.length > 10) {
      existing.shift();
    }
    
    localStorage.setItem(savedKey, JSON.stringify(existing));
    this.emit('cart:savedForLater', savedCart);

    return savedCart;
  }

  /**
   * Load saved cart
   */
  loadSavedCart(savedCartId: string): boolean {
    const savedKey = 'clickflash_saved_carts';
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    const cart = saved.find((c: SavedCart) => c.id === savedCartId);
    
    if (cart) {
      this.items = [...this.items, ...cart.items];
      this.saveToStorage();
      this.emit('cart:loaded', this.items);
      return true;
    }
    return false;
  }

  /**
   * Get saved carts
   */
  getSavedCarts(): SavedCart[] {
    const savedKey = 'clickflash_saved_carts';
    return JSON.parse(localStorage.getItem(savedKey) || '[]');
  }

  /**
   * Apply discount code
   */
  applyDiscountCode(code: string): { valid: boolean; discount: number; message: string } {
    // Check against valid codes
    const validCodes: Record<string, { discount: number; type: 'percent' | 'fixed' }> = {
      'SAVE10': { discount: 10, type: 'percent' },
      'SAVE20': { discount: 20, type: 'percent' },
      'WELCOME': { discount: 15, type: 'percent' },
      'FLASH50': { discount: 50, type: 'percent' },
      '5OFF': { discount: 5, type: 'fixed' }
    };

    const upperCode = code.toUpperCase();
    const promo = validCodes[upperCode];

    if (!promo) {
      return { valid: false, discount: 0, message: 'Invalid discount code' };
    }

    const subtotal = this.getTotals().subtotal;
    let discount = 0;

    if (promo.type === 'percent') {
      discount = subtotal * (promo.discount / 100);
    } else {
      discount = promo.discount;
    }

    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      message: `${promo.discount}${promo.type === 'percent' ? '%' : '$'} discount applied!`
    };
  }

  /**
   * Check if cart has items from Money Trash
   */
  hasMoneyTrashItems(): boolean {
    return this.items.some(item => (item.photo as any).isFromMoneyTrash);
  }

  /**
   * Get Money Trash items
   */
  getMoneyTrashItems(): CartItem[] {
    return this.items.filter(item => (item.photo as any).isFromMoneyTrash);
  }

  /**
   * Merge guest cart with user cart after login
   */
  mergeWithUserCart(userCartItems: CartItem[]): void {
    // Add user items without duplicates
    userCartItems.forEach(userItem => {
      const exists = this.items.some(i => 
        i.photo.id === userItem.photo.id && i.product.id === userItem.product.id
      );
      if (!exists) {
        this.items.push(userItem);
      }
    });
    
    this.saveToStorage();
    this.emit('cart:merged', this.items);
  }

  /**
   * Export cart for sharing
   */
  exportCart(): string {
    const exportData = {
      items: this.items,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
    return btoa(JSON.stringify(exportData));
  }

  /**
   * Import cart from share code
   */
  importCart(shareCode: string): boolean {
    try {
      const data = JSON.parse(atob(shareCode));
      if (data.items && Array.isArray(data.items)) {
        this.items = [...this.items, ...data.items];
        this.saveToStorage();
        this.emit('cart:imported', this.items);
        return true;
      }
    } catch (error) {
      console.error('Failed to import cart:', error);
    }
    return false;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const persistentCart = new PersistentCartService();
export type { CartState, CartTotals, SavedCart };
