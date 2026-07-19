import Stripe from 'stripe';
import { Env } from '../types';

let stripeClient: Stripe | null = null;

export function getStripe(env: Env): Stripe {
  if (!stripeClient) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined in the environment.");
    }
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      httpClient: Stripe.createFetchHttpClient()
    });
  }
  return stripeClient;
}

export async function createCheckoutSession(
  env: Env,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  clientReferenceId: string,
  customerEmail: string,
  idempotencyKey: string,
) {
  const stripe = getStripe(env);

  const params: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: clientReferenceId,
    metadata: {
      source: 'clickflash_management',
      plan: 'pro',
      studioId: clientReferenceId,
    },
    subscription_data: {
      metadata: {
        source: 'clickflash_management',
        plan: 'pro',
        studioId: clientReferenceId,
      },
    },
  };

  params.customer_email = customerEmail;

  const session = await stripe.checkout.sessions.create(params, { idempotencyKey });
  return session;
}

export async function createGalleryCheckoutSession(
  env: Env,
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  successUrl: string,
  cancelUrl: string,
  clientReferenceId: string, // orderId or destinationId
  customerEmail?: string
) {
  const stripe = getStripe(env);

  const params: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment', // Unlike subscriptions, gallery checkouts are one-time payments
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: clientReferenceId,
  };

  if (customerEmail) {
    params.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(params);
  return session;
}

export async function handleWebhookEvent(env: Env, payload: string, signature: string): Promise<Stripe.Event> {
  const stripe = getStripe(env);
  
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not defined.");
  }

  return await stripe.webhooks.constructEventAsync(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );
}
