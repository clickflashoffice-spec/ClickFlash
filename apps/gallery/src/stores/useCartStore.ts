import { create } from 'zustand';
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

export const useCartStore = create<CartStoreState>((set, get) => ({
  items: [],
  get cart() {
    return get().items;
  },
  addItem: (
    photo,
    productId,
    productName = 'Digital High-Res',
    price = 19.99,
    _category,
    deliveryType = 'digital'
  ) => set((state) => {
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
    return { items: [...state.items, newItem] };
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id && i.photoId !== id)
  })),
  updateQuantity: (photoIdOrItemId, newQuantity) => set((state) => {
    if (newQuantity <= 0) {
      return { items: state.items.filter(i => i.id !== photoIdOrItemId && i.photoId !== photoIdOrItemId) };
    }
    return {
      items: state.items.map(i => 
        (i.id === photoIdOrItemId || i.photoId === photoIdOrItemId) 
          ? { ...i, quantity: newQuantity } 
          : i
      )
    };
  }),
  clearCart: () => set({ items: [] }),
  get total() {
    return get().items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  }
}));

export default useCartStore;
