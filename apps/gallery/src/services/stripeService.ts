import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with Publishable Key (exposed in Vite env)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!STRIPE_PUBLISHABLE_KEY) {
    console.error("Missing VITE_STRIPE_PUBLISHABLE_KEY in environment variables");
}

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY || '');

interface PaymentIntentResponse {
    clientSecret: string;
    dpmCheckerLink?: string;
    error?: string;
}

export const stripeService = {
    /**
     * Create a Checkout Payment Intent on the backend
     */
    async createPaymentIntent(orderId: string, amount: number, email?: string, currency: string = 'eur'): Promise<PaymentIntentResponse> {
        try {
            // Determine API URL (similar to apiService)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8092';

            const response = await fetch(`${API_URL}/api/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    amount: Math.round(amount * 100), // Convert to cents
                    currency: currency.toLowerCase(),
                    email
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Payment initialization failed');
            }

            return await response.json();
        } catch (error) {
            console.error("Stripe createPaymentIntent failed:", error);
            return { clientSecret: '', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
};
