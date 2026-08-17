import { useState, useEffect } from 'react';
import type { CartItem, Photo } from '../types';

export interface CartStoreState {
  items: CartItem[];
  cart: CartItem[];
  addItem: (
    photo: Photo,
    productId?: string,
    productName?: string,
    price?: number,
    category?: string,
    deliveryType?: 'digital' | 'print' | 'both'
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (photoIdOrItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  total: number;
}

let state: CartStoreState = {
  items: [],
  get cart() {
    return this.items;
  },
  addItem: (
    photo: Photo,
    productId?: string,
    productName: string = 'Digital High-Res',
    price: number = 19.99,
    _category?: string,
    deliveryType: 'digital' | 'print' | 'both' = 'digital'
  ) => {
    const newItem: CartItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      photoId: photo.id,
      photo,
      name: photo.title || productName,
      productId: productId || 'digital_single',
      format: productName,
      quantity: 1,
      price: typeof price === 'number' && !isNaN(price) ? price : 19.99,
      deliveryType
    };
    state.items = [...state.items, newItem];
    notify();
  },
  removeItem: (id: string) => {
    state.items = state.items.filter(i => i.id !== id && i.photoId !== id);
    notify();
  },
  updateQuantity: (photoIdOrItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      state.items = state.items.filter(i => i.id !== photoIdOrItemId && i.photoId !== photoIdOrItemId);
    } else {
      state.items = state.items.map(i => {
        if (i.id === photoIdOrItemId || i.photoId === photoIdOrItemId) {
          return { ...i, quantity: newQuantity };
        }
        return i;
      });
    }
    notify();
  },
  clearCart: () => {
    state.items = [];
    notify();
  },
  get total() {
    return this.items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  }
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export function useCartStore<T = CartStoreState>(selector?: (state: CartStoreState) => T): T {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (typeof selector === 'function') {
    return selector(state);
  }
  return state as unknown as T;
}

useCartStore.getState = (): CartStoreState => state;

export default useCartStore;
