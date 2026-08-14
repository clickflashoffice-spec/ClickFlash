import type { CartItem } from '@clickflash/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CheckoutModal, { stripeNightAppearance } from '@/components/customer/CheckoutModal';

jest.mock('@clickflash/ui', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/CurrencyContext.tsx', () => ({
  useCurrency: () => ({
    currency: { code: 'EUR' },
    formatCurrency: (value: number) => `€${value.toFixed(2)}`,
  }),
}));

jest.mock('@/components/customer/UpsellEngine.tsx', () => ({
  __esModule: true,
  default: () => <div data-testid="upsell-engine" />,
}));

jest.mock('@/services/cloudApiService', () => ({
  cloudApiService: { notifyCashPending: jest.fn() },
}));

jest.mock('@/services/moneyTrashService', () => ({
  moneyTrashService: {
    createCheckout: jest.fn(),
    clearCheckoutSession: jest.fn(),
  },
}));

const cartItem = {
  id: 'cart-1',
  photoId: 'photo-1',
  productId: 'digital-download',
  name: 'Digital photo',
  quantity: 1,
  price: 12,
  photo: {
    id: 'photo-1',
    url: 'https://example.test/photo-1.jpg',
    title: 'Pool portrait',
  },
} as CartItem;

describe('CheckoutModal Stripe Elements wizard', () => {
  beforeEach(() => {
    localStorage.setItem('gallery_token', 'gallery-token');
    localStorage.setItem('clickflash_cart_session', '123e4567-e89b-12d3-a456-426614174000');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        clientSecret: 'pi_test_secret_example',
        paymentIntentId: 'pi_test',
      }),
    } as Response);
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('uses Stripe night appearance tokens', () => {
    expect(stripeNightAppearance.theme).toBe('night');
    expect(stripeNightAppearance.variables?.colorPrimary).toBe('#22d3ee');
  });

  it('moves from review to an embedded PaymentElement', async () => {
    render(
      <CheckoutModal
        isOpen
        cart={[cartItem]}
        total={12}
        onClose={jest.fn()}
        onUpdateQuantity={jest.fn()}
        albumId="album-1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue to secure payment' }));

    await waitFor(() => expect(screen.getByTestId('payment-element')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments/create-intent'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
