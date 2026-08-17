import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductType = 
  | 'digital'
  | 'print_4x6'
  | 'print_5x7'
  | 'print_8x10'
  | 'photobook_hardcover'
  | 'photobook_layflat'
  | 'canvas_16x20'
  | 'mug';

export interface CartItem {
  id: string; // unique item id
  type: ProductType;
  price: number; // in cents
  quantity: number;
  photoUrl: string;
  isHomeDelivery?: boolean; // True for albums & merchandise shipped home
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay' | 'paypal' | 'room_charge' | 'counter_cash';

export interface VenuePaymentSettings {
  allowStripe: boolean;
  allowApplePay: boolean;
  allowGooglePay: boolean;
  allowPayPal: boolean;
  allowRoomCharge: boolean;
  allowCounterPay: boolean;
  currency: string;
}

interface CartState {
  items: CartItem[];
  promoCode: string | null;
  shippingAddress: ShippingAddress | null;
  paymentMethod: PaymentMethodType;
  venueSettings: VenuePaymentSettings;
  addItem: (item: CartItem) => void;
  removeItem: (id: string, type?: ProductType) => void;
  updateQuantity: (id: string, quantity: number, type?: ProductType) => void;
  setPromoCode: (code: string | null) => void;
  setShippingAddress: (addr: ShippingAddress) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setVenueSettings: (settings: Partial<VenuePaymentSettings>) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  hasHomeDeliveryItems: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      shippingAddress: null,
      paymentMethod: 'card',
      venueSettings: {
        allowStripe: true,
        allowApplePay: true,
        allowGooglePay: true,
        allowPayPal: true,
        allowRoomCharge: true,
        allowCounterPay: true,
        currency: 'USD',
      },
      addItem: (item) => set((state) => {
        const isHomeDelivery = item.type.startsWith('photobook_') || item.type === 'canvas_16x20' || item.type === 'mug';
        const itemWithDelivery = { ...item, isHomeDelivery };
        const existingIndex = state.items.findIndex(i => i.id === item.id && i.type === item.type);
        if (existingIndex >= 0) {
          const newItems = [...state.items];
          newItems[existingIndex].quantity += item.quantity;
          return { items: newItems };
        }
        return { items: [...state.items, itemWithDelivery] };
      }),
      removeItem: (id, type) => set((state) => ({
        items: state.items.filter(i => type ? !(i.id === id && i.type === type) : i.id !== id)
      })),
      updateQuantity: (id, quantity, type) => set((state) => ({
        items: state.items.map(i => {
          if (type ? (i.id === id && i.type === type) : i.id === id) {
            return { ...i, quantity };
          }
          return i;
        })
      })),
      setPromoCode: (code) => set({ promoCode: code }),
      setShippingAddress: (addr) => set({ shippingAddress: addr }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setVenueSettings: (settings) => set((state) => ({
        venueSettings: { ...state.venueSettings, ...settings }
      })),
      clearCart: () => set({ items: [], promoCode: null }),
      getSubtotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      hasHomeDeliveryItems: () => {
        return get().items.some(i => i.isHomeDelivery);
      }
    }),
    {
      name: 'clickflash-cart',
    }
  )
);
