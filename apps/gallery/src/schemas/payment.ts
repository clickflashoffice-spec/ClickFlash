/**
 * Payment Validation Schemas
 * 
 * Zod schemas for payment data validation.
 * CRITICAL: Ensures all payment inputs are validated before processing.
 */

import { z } from 'zod';

// ============================================================================
// Currency and Amount Validation
// ============================================================================

/**
 * Supported currencies
 */
export const SupportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud'] as const;

/**
 * Currency code validation
 */
export const currencySchema = z.enum(SupportedCurrencies, {
  error: 'Invalid currency code',
});

/**
 * Amount validation schema
 * - Must be positive
 * - Maximum amount to prevent overflow (1 million)
 * - Supports 2 decimal places
 */
export const amountSchema = z
  .number({
    error: 'Amount is required and must be a number',
  })
  .positive('Amount must be positive')
  .max(1000000, 'Amount exceeds maximum allowed')
  .transform((val) => Math.round(val * 100) / 100); // Round to 2 decimal places

/**
 * Cents amount schema (for Stripe API)
 * - Integer representing cents
 */
export const centsAmountSchema = z
  .number()
  .int('Amount in cents must be an integer')
  .positive('Amount must be positive')
  .max(100000000, 'Amount exceeds maximum allowed'); // $1M in cents

// ============================================================================
// Payment Intent Schemas
// ============================================================================

/**
 * Payment intent creation request schema
 */
export const createPaymentIntentSchema = z.object({
  orderId: z
    .string()
    .min(1, 'Order ID is required')
    .max(100, 'Order ID too long'),
  
  amount: amountSchema,
  
  currency: currencySchema.default('eur'),
  
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  
  metadata: z
    .record(z.string(), z.string().max(500, 'Metadata value too long'))
    .optional(),
});

/**
 * Payment intent response schema
 */
export const paymentIntentResponseSchema = z.object({
  clientSecret: z
    .string()
    .min(1, 'Client secret is required')
    .regex(/^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/, 'Invalid client secret format'),
  
  paymentIntentId: z
    .string()
    .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID format'),
  
  dpmCheckerLink: z
    .string()
    .url()
    .optional(),
});

// ============================================================================
// Card Payment Schemas
// ============================================================================

/**
 * Card number validation (Luhn algorithm check)
 */
export const cardNumberSchema = z
  .string()
  .min(13, 'Card number too short')
  .max(19, 'Card number too long')
  .regex(/^\d+$/, 'Card number must contain only digits')
  .refine((val) => {
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = val.length - 1; i >= 0; i--) {
      let digit = parseInt(val.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  }, 'Invalid card number');

/**
 * Card expiry date validation (MM/YY or MM/YYYY format)
 */
export const cardExpirySchema = z
  .string()
  .regex(/^(0[1-9]|1[0-2])\/\d{2,4}$/, 'Invalid expiry date format (MM/YY)')
  .refine((val) => {
    const [month, year] = val.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    let fullYear = parseInt(year, 10);
    if (year.length === 2) {
      fullYear = 2000 + fullYear;
    }
    
    const expMonth = parseInt(month, 10);
    
    // Check if card is expired
    if (fullYear < currentYear || (fullYear === currentYear && expMonth < currentMonth)) {
      return false;
    }
    
    return true;
  }, 'Card has expired');

/**
 * CVC validation
 */
export const cvcSchema = z
  .string()
  .regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits');

/**
 * Complete card details schema
 */
export const cardDetailsSchema = z.object({
  number: cardNumberSchema,
  expiry: cardExpirySchema,
  cvc: cvcSchema,
  name: z
    .string()
    .min(2, 'Cardholder name is required')
    .max(100, 'Cardholder name too long'),
});

// ============================================================================
// Order Payment Schemas
// ============================================================================

/**
 * Order item validation for payment
 */
export const orderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  format: z.string().min(1).max(50),
  quantity: z.number().int().positive(),
  price: amountSchema,
});

/**
 * Order payment request schema
 */
export const orderPaymentRequestSchema = z.object({
  clientName: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name too long'),
  
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  
  total: amountSchema,
  
  photographerId: z.number().int().positive(),
  
  destinationId: z.string().optional(),
  
  items: z
    .array(orderItemSchema)
    .min(1, 'At least one item is required'),
  
  appliedDiscount: z.number().min(0).default(0),
});

// ============================================================================
// Webhook Event Schemas
// ============================================================================

/**
 * Stripe webhook event types
 */
export const webhookEventTypes = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.created',
  'payment_intent.canceled',
  'charge.succeeded',
  'charge.failed',
  'charge.refunded',
  'charge.dispute.created',
  'checkout.session.completed',
  'checkout.session.expired',
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
] as const;

/**
 * Webhook event type schema
 */
export const webhookEventTypeSchema = z.enum(webhookEventTypes);

/**
 * Webhook payload schema
 */
export const webhookPayloadSchema = z.object({
  id: z.string().startsWith('evt_'),
  object: z.literal('event'),
  api_version: z.string().optional(),
  created: z.number(),
  data: z.object({
    object: z.record(z.string(), z.unknown()),
    previous_attributes: z.record(z.string(), z.unknown()).optional(),
  }),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable(),
  }),
  type: webhookEventTypeSchema,
});

// ============================================================================
// Refund Schemas
// ============================================================================

/**
 * Refund request schema
 */
export const refundRequestSchema = z.object({
  paymentIntentId: z
    .string()
    .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID'),
  
  amount: amountSchema.optional(), // If not provided, full refund
  
  reason: z
    .enum(['duplicate', 'fraudulent', 'requested_by_customer', 'other'])
    .optional(),
  
  metadata: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PaymentIntentResponse = z.infer<typeof paymentIntentResponseSchema>;
export type CardDetails = z.infer<typeof cardDetailsSchema>;
export type OrderPaymentRequest = z.infer<typeof orderPaymentRequestSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;
export type Currency = z.infer<typeof currencySchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate payment intent creation request
 */
export function validatePaymentIntentRequest(data: unknown) {
  return createPaymentIntentSchema.safeParse(data);
}

/**
 * Validate order payment request
 */
export function validateOrderPaymentRequest(data: unknown) {
  return orderPaymentRequestSchema.safeParse(data);
}

/**
 * Validate card details
 */
export function validateCardDetails(data: unknown) {
  return cardDetailsSchema.safeParse(data);
}

/**
 * Validate webhook payload
 */
export function validateWebhookPayload(data: unknown) {
  return webhookPayloadSchema.safeParse(data);
}

/**
 * Validate refund request
 */
export function validateRefundRequest(data: unknown) {
  return refundRequestSchema.safeParse(data);
}

/**
 * Sanitize and validate amount
 */
export function sanitizeAmount(amount: unknown): number | null {
  const result = amountSchema.safeParse(amount);
  return result.success ? result.data : null;
}

/**
 * Check if currency is supported
 */
export function isSupportedCurrency(currency: string): currency is Currency {
  return SupportedCurrencies.includes(currency as Currency);
}
