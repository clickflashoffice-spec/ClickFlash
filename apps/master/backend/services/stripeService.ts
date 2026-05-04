import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

const getStripe = () => {
    if (!stripeInstance) {
        const apiKey = process.env.STRIPE_SECRET_KEY;
        if (!apiKey || apiKey === 'sk_test_placeholder_key_for_dev_backup') {
            console.warn('[StripeService] Warning: Using placeholder or missing STRIPE_SECRET_KEY');
        }
        stripeInstance = new Stripe(apiKey || '', {
            apiVersion: '2026-02-25.clover'
        });
    }
    return stripeInstance;
};

export interface CheckoutSessionParams {
    orderId: string;
    items: Array<{
        photoId: string;
        product: string;
        quantity: number;
        price: number;
    }>;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
}

/**
 * Create Stripe Checkout Session for gallery order
 */
export const createCheckoutSession = async (
    params: CheckoutSessionParams
): Promise<Stripe.Checkout.Session> => {
    const { orderId, items, customerEmail, successUrl, cancelUrl } = params;

    // Convert cart items to Stripe line items
    const lineItems = items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: `Photo ${item.photoId.substring(0, 8)} - ${item.product}`,
                description: getProductDescription(item.product)
            },
            unit_amount: Math.round(item.price * 100) // Convert to cents
        },
        quantity: item.quantity
    }));

    // Create Checkout Session
    const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
        metadata: {
            orderId,
            source: 'gallery'
        },
        allow_promotion_codes: true
    });

    return session;
};

/**
 * Verify webhook signature.
 * Throws at call-time (not silently) when the secret is absent so that a
 * misconfigured production deployment fails loudly on the first webhook hit
 * rather than silently accepting or rejecting every event.
 */
export const constructWebhookEvent = (
    payload: string | Buffer,
    signature: string
): Stripe.Event => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error(
            '[StripeService] STRIPE_WEBHOOK_SECRET is not set. ' +
            'Cannot verify webhook signature — set the env var to proceed.'
        );
    }

    return getStripe().webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
    );
};

/**
 * Retrieve Checkout Session
 */
export const retrieveCheckoutSession = async (
    sessionId: string
): Promise<Stripe.Checkout.Session> => {
    return await getStripe().checkout.sessions.retrieve(sessionId);
};

// Helper function
const getProductDescription = (product: string): string => {
    const descriptions: Record<string, string> = {
        'digital': 'High-resolution digital download',
        '4x6': '4x6 inch photo print',
        '5x7': '5x7 inch photo print',
        '8x10': '8x10 inch photo print'
    };
    return descriptions[product] || product;
};

export default {
    createCheckoutSession,
    constructWebhookEvent,
    retrieveCheckoutSession
};
