import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Photo } from '@clickflash/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (photo: Photo, productId: string, name: string, price: number, format?: string, deliveryType?: 'digital' | 'print' | 'both') => void;
  removeItem: (photoId: string) => void;
  updateQuantity: (photoId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (photo, productId, name, price, format, deliveryType) => {
        set((state) => {
          const existingIndex = state.items.findIndex((item) => item.photoId === photo.id);
          
          if (existingIndex >= 0) {
            if (productId === 'moneytrash_single') return state;
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + 1,
            };
            return { items: updatedItems };
          }

          const newItem: CartItem = {
            id: crypto.randomUUID(),
            photoId: photo.id,
            photo,
            name,
            format,
            quantity: 1,
            price,
            deliveryType,
            productId,
          };

          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (photoId) => {
        set((state) => ({
          items: state.items.filter((item) => item.photoId !== photoId),
        }));
      },

      updateQuantity: (photoId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(photoId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.photoId === photoId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      setCartOpen: (open) => set({ isOpen: open }),

      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'clickflash-cart',
      version: 2,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<CartState>;
        return {
          items: version < 2 || !Array.isArray(state.items) ? [] : state.items,
        };
      },
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export default useCartStore;
