import { Env } from '../types';
import { createCheckoutSession, handleWebhookEvent } from '../services/stripeService';
import { createErrorResponse } from '../errorHandler';

export async function handleBilling(
  request: Request,
  env: Env,
  url: URL,
  corsHeaders: any
): Promise<Response | null> {
  // --- POST /api/billing/checkout ---
  if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { priceId, successUrl, cancelUrl, studioName, email } = body;
      
      if (!priceId || !successUrl || !cancelUrl || !studioName || !email) {
        return createErrorResponse(400, "Bad Request", "Missing required checkout parameters", undefined, undefined, corsHeaders);
      }

      // Check if studio already exists to get a client reference ID
      const { results } = await env.DB.prepare('SELECT id FROM studios WHERE email = ?').bind(email).all();
      let studioId = results?.[0]?.id as string;
      
      if (!studioId) {
        // We will provision the studio ID ahead of time so the webhook knows which studio to update
        studioId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO studios (id, name, email, subscription_status, billing_tier)
          VALUES (?, ?, ?, 'incomplete', 'Free')
        `).bind(studioId, studioName, email).run();
      }

      const session = await createCheckoutSession(
        env,
        priceId,
        successUrl,
        cancelUrl,
        studioId, // clientReferenceId
        email
      );

      return Response.json({ url: session.url }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Checkout error:', error);
      return createErrorResponse(500, "Internal Server Error", "Failed to create checkout session", undefined, undefined, corsHeaders);
    }
  }

  // --- POST /api/billing/webhook ---
  if (url.pathname === "/api/billing/webhook" && request.method === "POST") {
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return createErrorResponse(400, "Bad Request", "Missing stripe signature", undefined, undefined, corsHeaders);
    }

    let event;
    try {
      // req.body must be the raw string/buffer for constructEventAsync
      const payload = await request.text();
      event = await handleWebhookEvent(env, payload, signature);
    } catch (err: any) {
      console.error('Webhook signature verification error:', err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        
        if (session.mode === 'payment') {
          // Gallery Checkout Fulfillment
          const orderId = session.client_reference_id;
          if (orderId) {
            await env.DB.prepare(`
              UPDATE orders SET status = 'Completed' WHERE id = ?
            `).bind(orderId).run();
            
            // Fulfillment logic could trigger an email here (e.g. via Resend/Sendgrid)
            // containing the download link for digital assets
          }
          return Response.json({ received: true }, { headers: corsHeaders });
        }

        // Studio Subscription Checkout Fulfillment
        const studioId = session.client_reference_id;
        const customerId = session.customer;
        
        if (studioId) {
          // Provision the studio properly since they have paid
          await env.DB.prepare(`
            UPDATE studios 
            SET stripe_customer_id = ?, subscription_status = 'active', billing_tier = 'Pro' 
            WHERE id = ?
          `).bind(customerId, studioId).run();

          // Generate a license key for their first destination automatically
          const destinationId = crypto.randomUUID();
          const licenseKey = 'CF-LIVE-' + crypto.randomUUID().split('-').join('').toUpperCase();
          
          await env.DB.prepare(`
            INSERT INTO destinations (id, name, country, site_code, type, licenseKey, studio_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            destinationId, 
            'Main HQ', 
            'US', 
            destinationId.substring(0,6).toUpperCase(), 
            'Resort', 
            licenseKey, 
            studioId
          ).run();
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        await env.DB.prepare(`
          UPDATE studios 
          SET subscription_status = 'canceled', billing_tier = 'Free' 
          WHERE stripe_customer_id = ?
        `).bind(customerId).run();
      }
      
      return Response.json({ received: true }, { headers: corsHeaders });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return createErrorResponse(500, "Internal Server Error", "Failed to process webhook", undefined, undefined, corsHeaders);
    }
  }

  return null;
}
