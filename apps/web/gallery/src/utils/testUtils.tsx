/**
 * Test Utilities for Gallery App
 * 
 * Provides custom render function with providers and Stripe mocks for testing.
 * CRITICAL: Includes comprehensive Stripe.js mocks for payment testing.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyProvider } from '../components/CurrencyContext';
import { ThemeProvider } from '../components/ThemeContext';

// ============================================================================
// Stripe Mocks
// ============================================================================

/**
 * Mock Stripe Elements for testing payment components
 */
export const mockStripeElements = {
  getElement: jest.fn(),
  submit: jest.fn(),
  fetchUpdates: jest.fn(),
};

/**
 * Mock Stripe instance
 */
export const mockStripe = {
  // Payment confirmation
  confirmPayment: jest.fn(),
  confirmCardPayment: jest.fn(),
  confirmCardSetup: jest.fn(),
  
  // Payment element methods
  createPaymentMethod: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  
  // Element creation
  elements: jest.fn(() => mockStripeElements),
  
  // Event handlers
  on: jest.fn(),
  off: jest.fn(),
};

/**
 * Mock @stripe/stripe-js module
 */
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve(mockStripe)),
}));

/**
 * Mock @stripe/react-stripe-js hooks and components
 */
jest.mock('@stripe/react-stripe-js', () => ({
  // Hooks
  useStripe: jest.fn(() => mockStripe),
  useElements: jest.fn(() => mockStripeElements),
  
  // Components
  Elements: ({ children }: { children: ReactNode }) => <>{children}</>,
  PaymentElement: () => (
    <div data-testid="payment-element">
      <input 
        data-testid="card-number-input" 
        placeholder="Card number"
        aria-label="Card number"
      />
      <input 
        data-testid="card-expiry-input" 
        placeholder="MM / YY"
        aria-label="Expiration date"
      />
      <input 
        data-testid="card-cvc-input" 
        placeholder="CVC"
        aria-label="CVC"
      />
    </div>
  ),
  CardElement: () => (
    <input 
      data-testid="card-element" 
      placeholder="Card details"
      aria-label="Credit or debit card"
    />
  ),
  CardNumberElement: () => (
    <input 
      data-testid="card-number-element" 
      placeholder="Card number"
      aria-label="Card number"
    />
  ),
  CardExpiryElement: () => (
    <input 
      data-testid="card-expiry-element" 
      placeholder="MM / YY"
      aria-label="Expiration date"
    />
  ),
  CardCvcElement: () => (
    <input 
      data-testid="card-cvc-element" 
      placeholder="CVC"
      aria-label="CVC"
    />
  ),
  AddressElement: ({ options }: { options?: { mode?: string } }) => (
    <div data-testid="address-element">
      <input data-testid="address-line1" placeholder="Address line 1" />
      <input data-testid="address-city" placeholder="City" />
      <input data-testid="address-postal" placeholder="Postal code" />
    </div>
  ),
  LinkAuthenticationElement: () => (
    <input 
      data-testid="link-auth-element" 
      placeholder="Email"
      aria-label="Email"
    />
  ),
  ExpressCheckoutElement: () => (
    <div data-testid="express-checkout-element">
      <button data-testid="apple-pay-button">Apple Pay</button>
      <button data-testid="google-pay-button">Google Pay</button>
    </div>
  ),
  
  // Utility functions
  useCartElement: jest.fn(() => null),
  useCartElementState: jest.fn(() => ({ lineItems: [] })),
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Reset all Stripe mocks between tests
 */
export function resetStripeMocks(): void {
  jest.clearAllMocks();
  
  // Reset mock implementations
  mockStripe.confirmPayment.mockReset();
  mockStripe.confirmCardPayment.mockReset();
  mockStripe.createPaymentMethod.mockReset();
  mockStripe.retrievePaymentIntent.mockReset();
  mockStripe.elements.mockReset().mockReturnValue(mockStripeElements);
  
  mockStripeElements.getElement.mockReset();
  mockStripeElements.submit.mockReset().mockResolvedValue(undefined);
  mockStripeElements.fetchUpdates.mockReset().mockResolvedValue(undefined);
}

/**
 * Simulate successful payment
 */
export function mockPaymentSuccess(paymentIntentId = 'pi_test_123'): void {
  mockStripe.confirmPayment.mockResolvedValue({
    paymentIntent: {
      id: paymentIntentId,
      status: 'succeeded',
    },
    error: null,
  });
}

/**
 * Simulate payment error
 */
export function mockPaymentError(errorMessage = 'Your card was declined'): void {
  mockStripe.confirmPayment.mockResolvedValue({
    paymentIntent: null,
    error: {
      type: 'card_error',
      code: 'card_declined',
      message: errorMessage,
      decline_code: 'generic_decline',
    },
  });
}

/**
 * Simulate network error during payment
 */
export function mockPaymentNetworkError(): void {
  mockStripe.confirmPayment.mockRejectedValue(
    new Error('Network error occurred')
  );
}

/**
 * Simulate loading state
 */
export function mockPaymentLoading(): void {
  mockStripe.confirmPayment.mockImplementation(
    () => new Promise(() => {}) // Never resolves
  );
}

// ============================================================================
// Custom Render
// ============================================================================

interface AllProvidersProps {
  children: ReactNode;
}

/**
 * All providers wrapper for tests
 */
const AllTheProviders = ({
  children,
}: AllProvidersProps) => {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
    </ThemeProvider>
  );
};

/**
 * Custom render options
 */
type CustomRenderOptions = Omit<RenderOptions, 'wrapper'>;

/**
 * Custom render function that wraps components with all necessary providers
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof render> & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();

  const result = render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders>
        {children}
      </AllTheProviders>
    ),
    ...options,
  });

  return { ...result, user };
}

// ============================================================================
// Async Test Helpers
// ============================================================================

/**
 * Wait for loading state to resolve
 */
export async function waitForLoadingToFinish(): Promise<void> {
  const loaders = screen.queryAllByRole('progressbar');
  if (loaders.length > 0) {
    await waitFor(() => {
      expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    });
  }
}

/**
 * Wait for element to be removed
 */
export async function waitForElementToBeRemoved(
  element: HTMLElement | HTMLElement[]
): Promise<void> {
  await waitFor(() => expect(element).not.toBeInTheDocument());
}

// ============================================================================
// Payment Test Helpers
// ============================================================================

/**
 * Fill payment form with test card details
 */
export async function fillPaymentForm(
  user: ReturnType<typeof userEvent.setup>,
  cardDetails: {
    number?: string;
    expiry?: string;
    cvc?: string;
  } = {}
): Promise<void> {
  const {
    number = '4242424242424242',
    expiry = '12/30',
    cvc = '123',
  } = cardDetails;

  const cardNumberInput = screen.getByTestId('card-number-input');
  const cardExpiryInput = screen.getByTestId('card-expiry-input');
  const cardCvcInput = screen.getByTestId('card-cvc-input');

  await user.type(cardNumberInput, number);
  await user.type(cardExpiryInput, expiry);
  await user.type(cardCvcInput, cvc);
}

/**
 * Submit payment form
 */
export async function submitPaymentForm(
  user: ReturnType<typeof userEvent.setup>
): Promise<void> {
  const submitButton = screen.getByRole('button', { name: /pay/i });
  await user.click(submitButton);
}

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create mock photo for testing
 */
export function createMockPhoto(overrides = {}) {
  return {
    id: 'photo-1',
    albumId: 'album-1',
    title: 'Test Photo',
    url: 'https://example.com/photo.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    photographerId: 1,
    category: 'Portrait',
    ...overrides,
  };
}

/**
 * Create mock product for testing
 */
export function createMockProduct(overrides = {}) {
  return {
    id: 'product-1',
    name: 'Test Product',
    category: 'Print',
    price: 25.00,
    stock: 10,
    ...overrides,
  };
}

/**
 * Create mock order for testing
 */
export function createMockOrder(overrides = {}) {
  return {
    id: 'order-1',
    clientName: 'John Doe',
    email: 'john@example.com',
    total: 50.00,
    status: 'Pending',
    items: [],
    ...overrides,
  };
}

/**
 * Create mock cart item for testing
 */
export function createMockCartItem(overrides = {}) {
  return {
    id: 'cart-item-1',
    photo: createMockPhoto(),
    product: createMockProduct(),
    quantity: 1,
    size: '4x6',
    price: 25.00,
    mode: 'Normal',
    ...overrides,
  };
}

// ============================================================================
// Re-exports
// ============================================================================

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// Export custom render as default
export { customRender as render };
