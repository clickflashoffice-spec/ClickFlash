/**
 * Handle incoming webhooks
 * POST /api/webhooks/:event
 */

import { Env } from '../../index';

export async function handleWebhook(request: Request, env: Env, params: Record<string, string>): Promise<Response> {
  try {
    const { event } = params;
    const signature = request.headers.get('X-Webhook-Signature');
    
    // Verify webhook signature
    if (!verifyWebhookSignature(await request.text(), signature, env.WEBHOOK_SECRET)) {
      return Response.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    switch (event) {
      case 'payment.completed':
        await handlePaymentCompleted(body, env);
        break;
        
      case 'gallery.purchased':
        await handleGalleryPurchased(body, env);
        break;
        
      case 'order.fulfilled':
        await handleOrderFulfilled(body, env);
        break;
        
      default:
        return Response.json(
          { error: 'Unknown event type' },
          { status: 400 }
        );
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  
  // In production, implement HMAC-SHA256 verification
  // const expected = crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload + secret));
  // return signature === expected;
  
  return true; // Simplified for now
}

async function handlePaymentCompleted(body: any, env: Env): Promise<void> {
  // Update order status
  await env.DB.prepare(
    `UPDATE orders 
     SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).bind(body.orderId).run();
  
  // Send notification to MoneyTrash app
  await notifyOffice(body.officeId, {
    type: 'payment.completed',
    orderId: body.orderId,
    amount: body.amount,
  }, env);
}

async function handleGalleryPurchased(body: any, env: Env): Promise<void> {
  // Update gallery stats
  await env.DB.prepare(
    `UPDATE galleries 
     SET purchase_count = COALESCE(purchase_count, 0) + 1,
         revenue = COALESCE(revenue, 0) + ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(body.amount, body.galleryId).run();
}

async function handleOrderFulfilled(body: any, env: Env): Promise<void> {
  // Mark assets as delivered
  await env.DB.prepare(
    `UPDATE assets 
     SET status = 'delivered', delivered_at = datetime('now')
     WHERE order_id = ?`
  ).bind(body.orderId).run();
}

async function notifyOffice(officeId: string, data: any, env: Env): Promise<void> {
  // Store notification for polling
  await env.UPLOAD_SESSIONS.put(
    `notification:${officeId}:${Date.now()}`,
    JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    }),
    { expirationTtl: 86400 }
  );
}
