/**
 * Jest Setup for Gallery App Tests
 * 
 * Configures the testing environment with Stripe.js mocks and custom matchers.
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// ============================================================================
// Polyfills
// ============================================================================

// TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// ============================================================================
// Stripe.js Mock
// ============================================================================

/**
 * Mock Stripe.js for testing payment components without actual Stripe API calls.
 * This ensures tests are fast, deterministic, and don't require network access.
 */
const mockStripeJs = {
  // Stripe instance factory
  stripe: jest.fn(() => mockStripeInstance),
  
  // Load Stripe function
  loadStripe: jest.fn(() => Promise.resolve(mockStripeInstance)),
};

/**
 * Mock Stripe instance with all necessary methods
 */
const mockStripeInstance = {
  // Payment confirmation methods
  confirmPayment: jest.fn(),
  confirmCardPayment: jest.fn(),
  confirmCardSetup: jest.fn(),
  confirmSepaDebitPayment: jest.fn(),
  confirmSepaDebitSetup: jest.fn(),
  confirmIdealPayment: jest.fn(),
  confirmP24Payment: jest.fn(),
  confirmSofortPayment: jest.fn(),
  confirmBancontactPayment: jest.fn(),
  confirmEpsPayment: jest.fn(),
  confirmGiropayPayment: jest.fn(),
  confirmAlipayPayment: jest.fn(),
  confirmWechatPayPayment: jest.fn(),
  
  // Payment method methods
  createPaymentMethod: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  retrieveSetupIntent: jest.fn(),
  
  // Element methods
  elements: jest.fn(() => mockStripeElements),
  
  // Customer methods
  createToken: jest.fn(),
  createSource: jest.fn(),
};

/**
 * Mock Stripe Elements
 */
const mockStripeElements = {
  // Element retrieval
  getElement: jest.fn(),
  
  // Form submission
  submit: jest.fn().mockResolvedValue({ error: null }),
  
  // Updates
  fetchUpdates: jest.fn().mockResolvedValue({}),
  
  // Create individual elements
  create: jest.fn((type: string, options?: unknown) => ({
    mount: jest.fn(),
    unmount: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    update: jest.fn(),
    collapse: jest.fn(),
  })),
};

// Mock the @stripe/stripe-js module
jest.mock('@stripe/stripe-js', () => mockStripeJs);

// ============================================================================
// React Stripe Elements Mock
// ============================================================================

/**
 * Mock @stripe/react-stripe-js for component testing
 */
jest.mock('@stripe/react-stripe-js', () => ({
  // Hooks
  useStripe: jest.fn(() => mockStripeInstance),
  useElements: jest.fn(() => mockStripeElements),
  useCartElement: jest.fn(() => null),
  useCartElementState: jest.fn(() => ({ lineItems: [], total: 0 })),
  
  // Components
  Elements: function Elements({ children }: { children: React.ReactNode }) {
    return children;
  },
  
  PaymentElement: function PaymentElement(props: any) {
    return (
      <div data-testid="payment-element" {...props}>
        <input 
          data-testid="card-number-input"
          aria-label="Card number"
          placeholder="1234 1234 1234 1234"
        />
        <input 
          data-testid="card-expiry-input"
          aria-label="Expiration date"
          placeholder="MM / YY"
        />
        <input 
          data-testid="card-cvc-input"
          aria-label="CVC"
          placeholder="CVC"
        />
      </div>
    );
  },
  
  CardElement: function CardElement(props: any) {
    return (
      <input 
        data-testid="card-element"
        aria-label="Credit or debit card"
        placeholder="Card details"
        {...props}
      />
    );
  },
  
  CardNumberElement: function CardNumberElement(props: any) {
    return (
      <input 
        data-testid="card-number-element"
        aria-label="Card number"
        placeholder="1234 1234 1234 1234"
        {...props}
      />
    );
  },
  
  CardExpiryElement: function CardExpiryElement(props: any) {
    return (
      <input 
        data-testid="card-expiry-element"
        aria-label="Expiration date"
        placeholder="MM / YY"
        {...props}
      />
    );
  },
  
  CardCvcElement: function CardCvcElement(props: any) {
    return (
      <input 
        data-testid="card-cvc-element"
        aria-label="CVC"
        placeholder="CVC"
        {...props}
      />
    );
  },
  
  AddressElement: function AddressElement({ options }: { options?: any }) {
    return (
      <div data-testid="address-element">
        <input data-testid="address-line1" placeholder="Address line 1" />
        <input data-testid="address-city" placeholder="City" />
        <input data-testid="address-postal" placeholder="Postal code" />
        <input data-testid="address-country" placeholder="Country" />
      </div>
    );
  },
  
  LinkAuthenticationElement: function LinkAuthenticationElement(props: any) {
    return (
      <input 
        data-testid="link-auth-element"
        aria-label="Email"
        placeholder="Email"
        {...props}
      />
    );
  },
  
  ExpressCheckoutElement: function ExpressCheckoutElement(props: any) {
    return (
      <div data-testid="express-checkout-element">
        <button data-testid="apple-pay-button">Apple Pay</button>
        <button data-testid="google-pay-button">Google Pay</button>
      </div>
    );
  },
  
  PaymentRequestButtonElement: function PaymentRequestButtonElement(props: any) {
    return (
      <button data-testid="payment-request-button">
        Pay with browser
      </button>
    );
  },
  
  IbanElement: function IbanElement(props: any) {
    return (
      <input 
        data-testid="iban-element"
        aria-label="IBAN"
        placeholder="IBAN"
        {...props}
      />
    );
  },
  
  IdealBankElement: function IdealBankElement(props: any) {
    return (
      <select data-testid="ideal-bank-element" aria-label="Select your bank">
        <option value="">Select your bank</option>
        <option value="abn_amro">ABN AMRO</option>
        <option value="ing">ING</option>
        <option value="rabobank">Rabobank</option>
      </select>
    );
  },
  
  // Utils
  useCustomCheckout: jest.fn(() => ({
    ready: true,
    lineItems: [],
    total: { amount: 0, currency: 'eur' },
  })),
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
  mockStripeInstance.confirmPayment.mockReset();
  mockStripeInstance.confirmCardPayment.mockReset();
  mockStripeInstance.createPaymentMethod.mockReset();
  mockStripeInstance.retrievePaymentIntent.mockReset();
  mockStripeInstance.elements.mockReset().mockReturnValue(mockStripeElements);
  
  mockStripeElements.getElement.mockReset();
  mockStripeElements.submit.mockReset().mockResolvedValue({ error: null });
  mockStripeElements.fetchUpdates.mockReset().mockResolvedValue({});
}

/**
 * Simulate successful payment
 */
export function mockPaymentSuccess(paymentIntentId = 'pi_test_123'): void {
  mockStripeInstance.confirmPayment.mockResolvedValue({
    paymentIntent: {
      id: paymentIntentId,
      status: 'succeeded',
      amount: 1000,
      currency: 'eur',
    },
    error: null,
  });
}

/**
 * Simulate payment error
 */
export function mockPaymentError(
  errorType = 'card_error',
  errorMessage = 'Your card was declined',
  code = 'card_declined'
): void {
  mockStripeInstance.confirmPayment.mockResolvedValue({
    paymentIntent: null,
    error: {
      type: errorType,
      code,
      message: errorMessage,
      decline_code: 'generic_decline',
    },
  });
}

/**
 * Simulate network error during payment
 */
export function mockPaymentNetworkError(message = 'Network error occurred'): void {
  mockStripeInstance.confirmPayment.mockRejectedValue(new Error(message));
}

/**
 * Simulate loading state (never resolves)
 */
export function mockPaymentLoading(): void {
  mockStripeInstance.confirmPayment.mockImplementation(
    () => new Promise(() => {}) // Never resolves
  );
}

// ============================================================================
// Global Test Setup
// ============================================================================

// Reset all mocks before each test
beforeEach(() => {
  resetStripeMocks();
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom matcher for range checking
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// ============================================================================
// Console Suppression in Tests
// ============================================================================

// Suppress specific console methods during tests to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Filter out specific React/Stripe warnings in tests
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('ReactDOM.render') ||
      message.includes('act(') ||
      message.includes('stripe') // Stripe warnings in test environment
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('componentWillReceiveProps') ||
      message.includes('Stripe') // Stripe warnings in test environment
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
