// apps/gallery/backend/stripe-webhook.ts

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { Resend } from 'resend';

// Configure Stripe (fallback to dummy key for typechecking if env is missing)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_123';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-06-24.dahlia',
});

// Configure Resend for emails
const resendKey = process.env.RESEND_API_KEY || 're_123';
const resend = new Resend(resendKey);

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).send('Webhook Secret or Signature missing');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook Error:', (err as Error).message);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Payment successful for session ${session.id}`);

        // Update database / fulfill order
        // e.g., call Cloudflare Worker API to update D1, or direct local DB update
        const customerEmail = session.customer_details?.email;
        
        if (customerEmail) {
          try {
            await resend.emails.send({
              from: 'orders@clickflash.app',
              to: customerEmail,
              subject: 'Your ClickFlash Order is Confirmed!',
              html: '<p>Thank you for your purchase. Your gallery access has been granted.</p>'
            });
            console.log(`Confirmation email sent to ${customerEmail}`);
          } catch (emailErr) {
            console.error('Failed to send email:', emailErr);
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
