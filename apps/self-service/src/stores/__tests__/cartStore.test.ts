import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../cartStore';

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({
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
    });
  });

  it('adds items and correctly determines home delivery', () => {
    const { addItem } = useCartStore.getState();

    addItem({
      id: 'photo_1',
      type: 'digital',
      price: 1500,
      quantity: 1,
      photoUrl: 'https://example.com/p1.jpg',
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().hasHomeDeliveryItems()).toBe(false);

    addItem({
      id: 'album_1',
      type: 'photobook_hardcover',
      price: 4500,
      quantity: 1,
      photoUrl: 'https://example.com/p1.jpg',
    });

    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().hasHomeDeliveryItems()).toBe(true);
  });

  it('increments quantity when adding identical item', () => {
    const { addItem } = useCartStore.getState();

    addItem({
      id: 'photo_1',
      type: 'print_5x7',
      price: 1200,
      quantity: 1,
      photoUrl: 'https://example.com/p1.jpg',
    });

    addItem({
      id: 'photo_1',
      type: 'print_5x7',
      price: 1200,
      quantity: 2,
      photoUrl: 'https://example.com/p1.jpg',
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('calculates subtotal correctly', () => {
    const { addItem, getSubtotal } = useCartStore.getState();

    addItem({
      id: 'photo_1',
      type: 'digital',
      price: 2000,
      quantity: 2,
      photoUrl: 'https://example.com/p1.jpg',
    });

    addItem({
      id: 'print_1',
      type: 'print_8x10',
      price: 1500,
      quantity: 1,
      photoUrl: 'https://example.com/p2.jpg',
    });

    expect(getSubtotal()).toBe(5500); // 2000*2 + 1500 = 5500
  });

  it('removes item and clears cart', () => {
    const { addItem, removeItem, clearCart } = useCartStore.getState();

    addItem({
      id: 'photo_1',
      type: 'digital',
      price: 1000,
      quantity: 1,
      photoUrl: 'https://example.com/p1.jpg',
    });
    addItem({
      id: 'photo_2',
      type: 'digital',
      price: 1000,
      quantity: 1,
      photoUrl: 'https://example.com/p2.jpg',
    });

    removeItem('photo_1');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe('photo_2');

    clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
