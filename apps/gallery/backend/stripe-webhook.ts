// apps/gallery/backend/stripe-webhook.ts

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { createLogger } from '@clickflash/logger';
import { PrintFulfillmentService } from './print-fulfillment';

const logger = createLogger({ serviceName: 'stripe-webhook' });

// Configure Stripe (fallback to dummy key for typechecking if env is missing)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_123';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2026-06-24.dahlia',
});

// Configure Nodemailer for custom SMTP emails (100% custom, no SaaS subscriptions)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'orders@clickflash.app',
    pass: process.env.SMTP_PASS || 'secret',
  },
});

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
    logger.error('Webhook Error', err instanceof Error ? err : { error: String(err) });
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info(`Payment successful for session ${session.id}`);

        // Update database / fulfill order
        // e.g., call Cloudflare Worker API to update D1, or direct local DB update
        const customerEmail = session.customer_details?.email;
        const shippingDetails = session.shipping_details?.address;
        const customerName = session.customer_details?.name || 'Customer';
        
        if (customerEmail) {
          try {
            // Attempt print fulfillment if there's shipping data
            let hasPhysicalPrints = false;
            
            if (shippingDetails && shippingDetails.country) {
              const mockPrintItems = [
                { id: 'item_1', name: '8x10 Glossy Print', quantity: 2, imageUrl: 'https://example.com/photo.jpg', type: 'print' as const },
                { id: 'item_2', name: 'Digital Download', quantity: 1, imageUrl: 'https://example.com/photo2.jpg', type: 'digital' as const }
              ];
              
              hasPhysicalPrints = await PrintFulfillmentService.placeOrder({
                orderId: session.id,
                customerEmail,
                shipping: {
                  name: customerName,
                  line1: shippingDetails.line1 || '',
                  line2: shippingDetails.line2 || '',
                  city: shippingDetails.city || '',
                  state: shippingDetails.state || '',
                  postal_code: shippingDetails.postal_code || '',
                  country: shippingDetails.country || 'US'
                },
                items: mockPrintItems
              });
            }

            const emailSubject = hasPhysicalPrints 
              ? 'Your ClickFlash Order & Print Confirmation!' 
              : 'Your ClickFlash Order is Confirmed!';
              
            const emailBody = hasPhysicalPrints
              ? '<p>Thank you for your purchase. Your gallery access has been granted and your physical prints are being sent to our lab!</p>'
              : '<p>Thank you for your purchase. Your digital gallery access has been granted.</p>';

            await transporter.sendMail({
              from: process.env.SMTP_FROM || '"ClickFlash Orders" <orders@clickflash.app>',
              to: customerEmail,
              subject: emailSubject,
              html: emailBody
            });
            logger.info(`Confirmation email sent to ${customerEmail} via Nodemailer`);
          } catch (emailErr) {
            logger.error('Failed to process order or send email', emailErr instanceof Error ? emailErr : { error: String(emailErr) });
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info(`PaymentIntent for ${paymentIntent.amount} was successful!`);
        break;
      }
      default:
        logger.warn(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling webhook event', error instanceof Error ? error : { error: String(error) });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
