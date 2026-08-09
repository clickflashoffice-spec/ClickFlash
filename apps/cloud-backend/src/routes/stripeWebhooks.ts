import { Hono } from 'hono';
import { verifyStripeSignature } from '../stripe';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/stripe', async (c) => {
  try {
    if (!c.env.STRIPE_WEBHOOK_SECRET) {
      return c.json({ error: 'Stripe webhook verification is not configured' }, 503);
    }

    const rawBody = await c.req.text();
    const signatureValid = await verifyStripeSignature(
      rawBody,
      c.req.header('Stripe-Signature'),
      c.env.STRIPE_WEBHOOK_SECRET
    );
    
    if (!signatureValid) return c.json({ error: 'Invalid Stripe signature' }, 401);

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const stripeEventId = event.id;

    let ledgerEventKind = '';
    switch (eventType) {
      case 'charge.succeeded':
        ledgerEventKind = 'PAYMENT_CAPTURED';
        break;
      case 'charge.refunded':
        ledgerEventKind = 'REFUND_POSTED';
        break;
      case 'payout.paid':
        ledgerEventKind = 'SETTLEMENT_POSTED';
        break;
      case 'charge.dispute.created':
        ledgerEventKind = 'ADJUSTMENT_POSTED';
        break;
    }

    if (ledgerEventKind) {
      try {
        const payload = event.data?.object || {};
        const aggregateId = payload.metadata?.photographerId || payload.metadata?.orderId || stripeEventId;
        
        await c.get('DB').prepare(
          `INSERT INTO photographer_events_v1 (id, aggregate_id, event_type, payload, processed)
           VALUES (?, ?, ?, ?, 0)`
        ).bind(
          stripeEventId,
          aggregateId,
          ledgerEventKind,
          JSON.stringify(payload)
        ).run();
      } catch (dbErr: any) {
        if (dbErr.message?.includes('UNIQUE constraint failed')) {
          return c.json({ received: true, status: 'already_processed' });
        }
        throw dbErr;
      }
    }

    return c.json({ received: true });
  } catch (error: any) {
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

export default app;
