/**
 * Vitest Setup for Gallery App Tests
 *
 * Configures the testing environment with Stripe.js mocks and custom matchers.
 * Migrated from Jest on 2026-06-14.
 */

import '@testing-library/jest-dom/vitest';
import { TextEncoder, TextDecoder } from 'util';
import { vi } from 'vitest';
import React from 'react';

// ============================================================================
// Polyfills
// ============================================================================

// TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// ============================================================================
// Canvas Mock — for Chart.js components in tests
// ============================================================================

class MockCanvasContext {
  fillRect = vi.fn();
  clearRect = vi.fn();
  getImageData = vi.fn(() => ({ data: new Array(4) }));
  putImageData = vi.fn();
  createImageData = vi.fn(() => ({ data: new Array(4) }));
  setTransform = vi.fn();
  drawImage = vi.fn();
  save = vi.fn();
  fillText = vi.fn();
  restore = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  closePath = vi.fn();
  stroke = vi.fn();
  translate = vi.fn();
  scale = vi.fn();
  rotate = vi.fn();
  arc = vi.fn();
  fill = vi.fn();
  measureText = vi.fn(() => ({ width: 0 }));
  transform = vi.fn();
  rect = vi.fn();
  clip = vi.fn();
}

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: class HTMLCanvasElement {
    getContext = vi.fn(() => new MockCanvasContext());
    toDataURL = vi.fn();
  },
});

// ============================================================================
// PocketBase Service Mock — prevents import.meta.env syntax errors
// ============================================================================



// ============================================================================
// Logger Mock — prevents import.meta syntax errors
// ============================================================================

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    payment: vi.fn(),
    security: vi.fn(),
  },
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    payment: vi.fn(),
    security: vi.fn(),
  },
}));

// ============================================================================
// Stripe.js Mock
// ============================================================================

/**
 * Mock Stripe.js for testing payment components without actual Stripe API calls.
 */
const mockStripeInstance = {
  confirmPayment: vi.fn(),
  confirmCardPayment: vi.fn(),
  confirmCardSetup: vi.fn(),
  confirmSepaDebitPayment: vi.fn(),
  confirmSepaDebitSetup: vi.fn(),
  confirmIdealPayment: vi.fn(),
  confirmP24Payment: vi.fn(),
  confirmSofortPayment: vi.fn(),
  confirmBancontactPayment: vi.fn(),
  confirmEpsPayment: vi.fn(),
  confirmGiropayPayment: vi.fn(),
  confirmAlipayPayment: vi.fn(),
  confirmWechatPayPayment: vi.fn(),
  createPaymentMethod: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  retrieveSetupIntent: vi.fn(),
  elements: vi.fn(() => mockStripeElements),
  createToken: vi.fn(),
  createSource: vi.fn(),
};

const mockStripeElements = {
  getElement: vi.fn(),
  submit: vi.fn().mockResolvedValue({ error: null }),
  fetchUpdates: vi.fn().mockResolvedValue({}),
  create: vi.fn((type: string, options?: unknown) => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    update: vi.fn(),
    collapse: vi.fn(),
  })),
};

const mockStripeJs = {
  stripe: vi.fn(() => mockStripeInstance),
  loadStripe: vi.fn(() => Promise.resolve(mockStripeInstance)),
};

vi.mock('@stripe/stripe-js', () => mockStripeJs);

// ============================================================================
// React Stripe Elements Mock
// ============================================================================

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: vi.fn(() => mockStripeInstance),
  useElements: vi.fn(() => mockStripeElements),
  useCartElement: vi.fn(() => null),
  useCartElementState: vi.fn(() => ({ lineItems: [], total: 0 })),
  Elements: function Elements({ children }: { children: React.ReactNode }) {
    return React.createElement(React.Fragment, null, children);
  },
  PaymentElement: function PaymentElement(props: any) {
    return React.createElement('div', { 'data-testid': 'payment-element', ...props },
      React.createElement('input', { 'data-testid': 'card-number-input', 'aria-label': 'Card number', placeholder: '1234 1234 1234 1234' }),
      React.createElement('input', { 'data-testid': 'card-expiry-input', 'aria-label': 'Expiration date', placeholder: 'MM / YY' }),
      React.createElement('input', { 'data-testid': 'card-cvc-input', 'aria-label': 'CVC', placeholder: 'CVC' })
    );
  },
  CardElement: function CardElement(props: any) {
    return React.createElement('input', { 'data-testid': 'card-element', 'aria-label': 'Credit or debit card', placeholder: 'Card details', ...props });
  },
  CardNumberElement: function CardNumberElement(props: any) {
    return React.createElement('input', { 'data-testid': 'card-number-element', 'aria-label': 'Card number', placeholder: '1234 1234 1234 1234', ...props });
  },
  CardExpiryElement: function CardExpiryElement(props: any) {
    return React.createElement('input', { 'data-testid': 'card-expiry-element', 'aria-label': 'Expiration date', placeholder: 'MM / YY', ...props });
  },
  CardCvcElement: function CardCvcElement(props: any) {
    return React.createElement('input', { 'data-testid': 'card-cvc-element', 'aria-label': 'CVC', placeholder: 'CVC', ...props });
  },
  AddressElement: function AddressElement({ options }: { options?: unknown }) {
    return React.createElement('div', { 'data-testid': 'address-element' },
      React.createElement('input', { 'data-testid': 'address-line1', placeholder: 'Address line 1' }),
      React.createElement('input', { 'data-testid': 'address-city', placeholder: 'City' }),
      React.createElement('input', { 'data-testid': 'address-postal', placeholder: 'Postal code' }),
      React.createElement('input', { 'data-testid': 'address-country', placeholder: 'Country' })
    );
  },
  LinkAuthenticationElement: function LinkAuthenticationElement(props: any) {
    return React.createElement('input', { 'data-testid': 'link-auth-element', 'aria-label': 'Email', placeholder: 'Email', ...props });
  },
  ExpressCheckoutElement: function ExpressCheckoutElement(props: any) {
    return React.createElement('div', { 'data-testid': 'express-checkout-element' },
      React.createElement('button', { 'data-testid': 'apple-pay-button' }, 'Apple Pay'),
      React.createElement('button', { 'data-testid': 'google-pay-button' }, 'Google Pay')
    );
  },
  PaymentRequestButtonElement: function PaymentRequestButtonElement(props: any) {
    return React.createElement('button', { 'data-testid': 'payment-request-button' }, 'Pay with browser');
  },
  IbanElement: function IbanElement(props: any) {
    return React.createElement('input', { 'data-testid': 'iban-element', 'aria-label': 'IBAN', placeholder: 'IBAN', ...props });
  },
  IdealBankElement: function IdealBankElement(props: any) {
    return React.createElement('select', { 'data-testid': 'ideal-bank-element', 'aria-label': 'Select your bank' },
      React.createElement('option', { value: '' }, 'Select your bank'),
      React.createElement('option', { value: 'abn_amro' }, 'ABN AMRO'),
      React.createElement('option', { value: 'ing' }, 'ING'),
      React.createElement('option', { value: 'rabobank' }, 'Rabobank')
    );
  },
  useCustomCheckout: vi.fn(() => ({
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
  vi.clearAllMocks();
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
  vi.restoreAllMocks();
});

// ============================================================================
// Custom Matchers
// ============================================================================

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeWithinRange(floor: number, ceiling: number): T;
  }
  interface AsymmetricMatchersContaining {
    toBeWithinRange(floor: number, ceiling: number): unknown;
  }
}

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
  console.error = (...args: unknown[]) => {
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

  console.warn = (...args: unknown[]) => {
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
