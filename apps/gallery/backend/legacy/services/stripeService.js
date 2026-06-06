/**
 * Stripe Service
 * Handles Stripe API operations
 */

class StripeService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error('Stripe API key is required');
        }
        this.stripe = require('stripe')(apiKey);
    }

    async createPaymentIntent(amount, currency = 'eur', metadata = {}) {
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            metadata,
            automatic_payment_methods: { enabled: true }
        });
        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        };
    }

    async createRefund(paymentIntentId, amount = null) {
        const params = { payment_intent: paymentIntentId };
        if (amount) params.amount = Math.round(amount * 100);
        return await this.stripe.refunds.create(params);
    }

    verifyWebhookSignature(payload, signature, webhookSecret) {
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
}

module.exports = StripeService;
