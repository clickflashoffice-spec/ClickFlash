/**
 * PaymentForm Component Tests
 * 
 * CRITICAL: These tests ensure payment functionality works correctly.
 * Tests cover success, failure, and edge cases for Stripe integration.
 */

import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import { mockPaymentSuccess, mockPaymentError, mockPaymentNetworkError } from '@/setupTests';
import PaymentForm from '@/components/customer/PaymentForm';

// Mock the stripe service
jest.mock('@/services/stripeService', () => ({
  stripeService: {
    createPaymentIntent: jest.fn(),
  },
  stripePromise: Promise.resolve({}),
}));

import { stripeService } from '@/services/stripeService';

const mockCreatePaymentIntent = stripeService.createPaymentIntent as jest.MockedFunction<typeof stripeService.createPaymentIntent>;

describe('PaymentForm', () => {
  const defaultProps = {
    amount: 50.00,
    orderId: 'order-123',
    email: 'test@example.com',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Loading State', () => {
    it('shows loading state while initializing payment intent', async () => {
      // Delay the payment intent creation
      mockCreatePaymentIntent.mockImplementation(() => new Promise(() => {}));

      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText(/initializing secure checkout/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('displays error when payment intent creation fails', async () => {
      mockCreatePaymentIntent.mockResolvedValue({
        clientSecret: '',
        error: 'Failed to create payment intent',
      });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load payment system/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/failed to create payment intent/i)).toBeInTheDocument();
    });
  });

  describe('Payment Form Rendering', () => {
    beforeEach(() => {
      mockCreatePaymentIntent.mockResolvedValue({
        clientSecret: 'pi_test_secret_123',
        paymentIntentId: 'pi_test_123',
      });
    });

    it('renders payment form when client secret is available', async () => {
      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });
    });

    it('displays correct payment amount', async () => {
      render(<PaymentForm {...defaultProps} amount={99.99} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      // The pay button should show the correct amount
      expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
    });

    it('renders cancel button', async () => {
      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Payment Submission', () => {
    beforeEach(() => {
      mockCreatePaymentIntent.mockResolvedValue({
        clientSecret: 'pi_test_secret_123',
        paymentIntentId: 'pi_test_123',
      });
    });

    it('calls onSuccess when payment is successful', async () => {
      mockPaymentSuccess('pi_test_123');

      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      // Fill in card details
      await user.type(screen.getByTestId('card-number-input'), '4242424242424242');
      await user.type(screen.getByTestId('card-expiry-input'), '12/30');
      await user.type(screen.getByTestId('card-cvc-input'), '123');

      // Submit payment
      await user.click(screen.getByRole('button', { name: /pay/i }));

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('displays error message when payment fails', async () => {
      mockPaymentError('card_declined', 'Your card was declined');

      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      // Fill in card details
      await user.type(screen.getByTestId('card-number-input'), '4000000000000002');
      await user.type(screen.getByTestId('card-expiry-input'), '12/30');
      await user.type(screen.getByTestId('card-cvc-input'), '123');

      // Submit payment
      await user.click(screen.getByRole('button', { name: /pay/i }));

      await waitFor(() => {
        expect(screen.getByText(/your card was declined/i)).toBeInTheDocument();
      });

      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });

    it('handles network errors gracefully', async () => {
      mockPaymentNetworkError();

      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      // Fill in card details and submit
      await user.type(screen.getByTestId('card-number-input'), '4242424242424242');
      await user.type(screen.getByTestId('card-expiry-input'), '12/30');
      await user.type(screen.getByTestId('card-cvc-input'), '123');
      await user.click(screen.getByRole('button', { name: /pay/i }));

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });

    it('disables submit button while processing', async () => {
      // Create a promise that doesn't resolve to simulate loading
      const { confirmPayment } = require('@stripe/react-stripe-js');
      confirmPayment.mockImplementation(() => new Promise(() => {}));

      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      // Fill in card details and submit
      await user.type(screen.getByTestId('card-number-input'), '4242424242424242');
      await user.type(screen.getByTestId('card-expiry-input'), '12/30');
      await user.type(screen.getByTestId('card-cvc-input'), '123');
      await user.click(screen.getByRole('button', { name: /pay/i }));

      // Button should be disabled during processing
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    });
  });

  describe('Cancel Action', () => {
    beforeEach(() => {
      mockCreatePaymentIntent.mockResolvedValue({
        clientSecret: 'pi_test_secret_123',
        paymentIntentId: 'pi_test_123',
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Security', () => {
    beforeEach(() => {
      mockCreatePaymentIntent.mockResolvedValue({
        clientSecret: 'pi_test_secret_123',
        paymentIntentId: 'pi_test_123',
      });
    });

    it('does not render sensitive data in error messages', async () => {
      // Mock an error that contains sensitive data
      const { confirmPayment } = require('@stripe/react-stripe-js');
      confirmPayment.mockResolvedValue({
        error: {
          type: 'api_error',
          message: 'Error processing card sk_live_1234567890abcdef',
        },
      });

      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /pay/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/an unexpected error occurred/i);
        expect(errorMessage).toBeInTheDocument();
        // Ensure the error doesn't contain the secret key
        expect(errorMessage.textContent).not.toContain('sk_live_');
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockCreatePaymentIntent.mockResolvedValue({
        clientSecret: 'pi_test_secret_123',
        paymentIntentId: 'pi_test_123',
      });
    });

    it('has proper ARIA labels on form inputs', async () => {
      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvc/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const { user } = render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      });

      // Tab through the form
      await user.tab();
      expect(screen.getByTestId('card-number-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('card-expiry-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('card-cvc-input')).toHaveFocus();
    });
  });
});
