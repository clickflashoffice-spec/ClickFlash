/**
 * Edge-Optimized Stripe Checkout Service
 * 
 * Provides enhanced Stripe integration with:
 * - Edge-optimized payment flows
 * - Digital Wallets (Apple Pay, Google Pay)
 * - saved payment methods
 * - Subscription support
 * - 3D Secure handling
 */

import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';

// Initialize Stripe
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null> = Promise.resolve(null);

if (!STRIPE_PUBLISHABLE_KEY) {
    console.error('[StripeService] Missing VITE_STRIPE_PUBLISHABLE_KEY');
} else {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
}

export interface PaymentIntentResponse {
    clientSecret: string;
    paymentIntentId: string;
    dpmCheckerLink?: string;
    amount?: number;
    error?: string;
}

export interface CheckoutSession {
    id: string;
    url: string;
    clientSecret?: string;
    paymentIntentId?: string;
    error?: string;
}

export interface PaymentMethod {
    id: string;
    type: 'card' | 'apple_pay' | 'google_pay';
    card?: {
        brand: string;
        last4: string;
        expMonth: number;
        expYear: number;
    };
}

export interface StripeConfig {
    appearance?: {
        theme?: 'stripe' | 'night' | 'flat';
        variables?: Record<string, string>;
        rules?: Record<string, Record<string, string>>;
    };
    fonts?: Array<{ cssSrc: string }>;
}

export interface EdgeCheckoutOptions {
    amount: number;
    currency?: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
    paymentMethodTypes?: string[];
    enableWallets?: boolean;
    savedPaymentMethodId?: string;
}

class StripeEdgeService {
    private static instance: StripeEdgeService;
    private stripe: Stripe | null = null;
    private elements: StripeElements | null = null;
    private cardElement: StripeCardElement | null = null;
    private config: StripeConfig;

    private constructor() {
        this.config = {
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#3b82f6',
                    colorBackground: '#ffffff',
                    colorText: '#1e293b',
                    colorDanger: '#ef4444',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    borderRadius: '8px',
                },
            },
        };
    }

    public static getInstance(): StripeEdgeService {
        if (!StripeEdgeService.instance) {
            StripeEdgeService.instance = new StripeEdgeService();
        }
        return StripeEdgeService.instance;
    }

    /**
     * Initialize Stripe with custom configuration
     */
    public async initialize(config?: StripeConfig): Promise<boolean> {
        if (!stripePromise) return false;
        
        try {
            this.stripe = await stripePromise;
            if (config) {
                this.config = { ...this.config, ...config };
            }
            return !!this.stripe;
        } catch (error) {
            console.error('[StripeService] Failed to initialize Stripe:', error);
            return false;
        }
    }

    /**
     * Get Stripe instance
     */
    public getStripe(): Stripe | null {
        return this.stripe;
    }

    /**
     * Create a Payment Intent for server-side payment
     */
    public async createPaymentIntent(
        orderId: string,
        amount: number,
        email?: string
    ): Promise<PaymentIntentResponse> {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8092';

            const response = await fetch(`${API_URL}/api/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    amount: Math.round(amount * 100),
                    currency: 'usd',
                    email,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment initialization failed');
            }

            return await response.json();
        } catch (error) {
            console.error('[StripeService] createPaymentIntent failed:', error);
            return { 
                clientSecret: '', 
                paymentIntentId: '',
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Create Checkout Session (for hosted checkout)
     */
    public async createCheckoutSession(options: EdgeCheckoutOptions): Promise<CheckoutSession> {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8092';

            const response = await fetch(`${API_URL}/api/payments/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: Math.round(options.amount * 100),
                    currency: options.currency || 'usd',
                    email: options.customerEmail,
                    metadata: options.metadata,
                    paymentMethodTypes: options.paymentMethodTypes || ['card'],
                    enableWallets: options.enableWallets,
                    mode: 'payment',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const session = await response.json();
            return {
                id: session.id,
                url: session.url,
                clientSecret: session.clientSecret,
                paymentIntentId: session.paymentIntentId,
            };
        } catch (error) {
            console.error('[StripeService] createCheckoutSession failed:', error);
            return { 
                id: '', 
                url: '',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Confirm payment with card element
     */
    public async confirmPayment(
        clientSecret: string,
        cardElement: StripeCardElement,
        billingDetails: {
            name: string;
            email?: string;
            address?: {
                line1?: string;
                city?: string;
                state?: string;
                postal_code?: string;
                country?: string;
            };
        }
    ): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> {
        if (!this.stripe) {
            await this.initialize();
        }

        if (!this.stripe) {
            return { success: false, error: 'Stripe not initialized' };
        }

        try {
            const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: billingDetails,
                },
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (paymentIntent?.status === 'succeeded') {
                return { success: true, paymentIntentId: paymentIntent.id };
            }

            return { success: false, error: 'Payment not completed' };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Create card element for embedded checkout
     */
    public async createCardElement(
        container: HTMLElement,
        options?: {
            style?: {
                base?: Record<string, string>;
                invalid?: Record<string, string>;
            };
        }
    ): Promise<StripeCardElement | null> {
        if (!this.stripe) {
            await this.initialize();
        }

        if (!this.stripe) {
            return null;
        }

        this.elements = this.stripe.elements({
            appearance: this.config.appearance,
            fonts: this.config.fonts,
        });

        const defaultStyle = {
            base: {
                fontSize: '16px',
                color: '#1e293b',
                fontFamily: 'Inter, system-ui, sans-serif',
                '::placeholder': {
                    color: '#94a3b8',
                },
            },
            invalid: {
                color: '#ef4444',
                iconColor: '#ef4444',
            },
        };

        this.cardElement = this.elements.create('card', {
            style: options?.style || defaultStyle,
            hidePostalCode: false,
        });

        this.cardElement.mount(container);

        return this.cardElement;
    }

    /**
     * Create Payment Element (new unified element)
     */
    public async createPaymentElement(
        container: HTMLElement,
        clientSecret: string,
        options?: {
            layout?: 'tabs' | 'accordion';
            paymentMethodOrder?: string[];
        }
    ): Promise<StripeElements | null> {
        if (!this.stripe) {
            await this.initialize();
        }

        if (!this.stripe) {
            return null;
        }

        this.elements = this.stripe.elements({
            clientSecret,
            appearance: this.config.appearance,
        });

        const paymentElement = this.elements.create('payment', {
            layout: options?.layout || 'tabs',
            paymentMethodOrder: options?.paymentMethodOrder || ['card', 'apple_pay', 'google_pay'],
        });

        paymentElement.mount(container);
        this.elements = this.elements;

        return this.elements;
    }

    /**
     * Handle 3D Secure authentication
     */
    public async handle3DSecure(
        clientSecret: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!this.stripe) {
            return { success: false, error: 'Stripe not initialized' };
        }

        try {
            const { error, paymentIntent } = await this.stripe.handleCardAction(clientSecret);

            if (error) {
                return { success: false, error: error.message };
            }

            if (paymentIntent?.status === 'succeeded') {
                return { success: true };
            }

            return { success: false, error: 'Authentication failed' };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Retrieve saved payment methods for customer
     */
    public async getSavedPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8092';

            const response = await fetch(`${API_URL}/api/payments/methods?customerId=${customerId}`);

            if (!response.ok) {
                throw new Error('Failed to retrieve payment methods');
            }

            const data = await response.json();
            return data.paymentMethods || [];
        } catch (error) {
            console.error('[StripeService] getSavedPaymentMethods failed:', error);
            return [];
        }
    }

    /**
     * Use saved payment method for checkout
     */
    public async checkoutWithSavedMethod(
        clientSecret: string,
        paymentMethodId: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!this.stripe) {
            return { success: false, error: 'Stripe not initialized' };
        }

        try {
            const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethodId,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (paymentIntent?.status === 'succeeded') {
                return { success: true };
            }

            return { success: false, error: 'Payment not completed' };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Check if digital wallets are available
     */
    public async isWalletsAvailable(): Promise<boolean> {
        if (!this.stripe) {
            await this.initialize();
        }

        if (!this.stripe) return false;

        // Check wallet availability via paymentRequest API
        try {
            const paymentRequest = this.stripe.paymentRequest({
                country: 'US',
                currency: 'usd',
                total: { label: 'Check', amount: 0 },
            });
            const result = await paymentRequest.canMakePayment();
            return !!(result?.applePay || result?.googlePay);
        } catch {
            return false;
        }
    }

    /**
     * Create Apple Pay session
     */
    public async createApplePaySession(
        amount: number,
        currency: string,
        description: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!this.stripe) {
            return { success: false, error: 'Stripe not initialized' };
        }

        try {
            const paymentRequest = this.stripe.paymentRequest({
                country: 'US',
                currency,
                total: {
                    label: description,
                    amount: Math.round(amount * 100),
                },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            // Check availability
            const result = await paymentRequest.canMakePayment();
            if (!result?.applePay) {
                return { success: false, error: 'Apple Pay not available' };
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Clean up elements
     */
    public destroyElements(): void {
        if (this.cardElement) {
            this.cardElement.destroy();
            this.cardElement = null;
        }
        this.elements = null;
    }

    /**
     * Get DPM (Direct Payment Messaging) checker link for compliance
     */
    public getDPMCheckerLink(): string {
        return 'https://dashboard.stripe.com/settings/payments/dpm';
    }
}

export const stripeEdgeService = StripeEdgeService.getInstance();
export default stripeEdgeService;
