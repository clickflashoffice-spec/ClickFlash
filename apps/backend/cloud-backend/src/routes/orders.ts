import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import { verifyStripeSignature } from '../stripe';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

app.post('/webhooks/stripe', async (c) => {
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

    const body = JSON.parse(rawBody);
    const eventType = body.type;

    if (eventType === 'payment_intent.succeeded') {
      const paymentIntent = body.data.object;
      const sessionId = paymentIntent.metadata?.sessionId;

      if (sessionId) {
        try {
          await c.get('DB').prepare(
            `INSERT INTO transactions (id, session_id, stripe_payment_intent_id, amount, currency, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), sessionId, paymentIntent.id, paymentIntent.amount, paymentIntent.currency, 'SUCCEEDED', new Date().toISOString()).run();
        } catch (dbErr: any) {
          if (dbErr.message?.includes('UNIQUE constraint failed') || dbErr.message?.includes('D1_ERROR')) {
            return c.json({ received: true, status: 'already_processed' });
          }
          throw dbErr;
        }

        await c.get('DB').prepare(
          `UPDATE sessions SET status = 'PAID' WHERE id = ?`
        ).bind(sessionId).run();

        const sessionRow = await c.get('DB').prepare(
          `SELECT customer_email, guest_name FROM sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (sessionRow && sessionRow.customer_email) {
          if (c.env.MANAGEMENT_BACKEND_URL) {
            try {
              await fetch(`${c.env.MANAGEMENT_BACKEND_URL}/api/email/relay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: 'ClickFlash Orders <orders@clicketflash.com>',
                  to: sessionRow.customer_email as string,
                  subject: 'Your ClickFlash Gallery is Ready!',
                  html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                      <h2>Hi ${escapeHtml(sessionRow.guest_name || 'Guest')},</h2>
                      <p>Your payment was successful and your digital photo gallery is now unlocked!</p>
                      <p>You can view and download your high-resolution photos securely using the link below:</p>
                      <div style="margin: 30px 0;">
                        <a href="https://gallery.clicketflash.com/session/${encodeURIComponent(sessionId)}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                          View My Gallery
                        </a>
                      </div>
                      <p>Thank you for choosing ClickFlash!</p>
                    </div>
                  `
                })
              });
            } catch (emailErr) {
              // Log silently
            }
          }
        }
      }
    }

    return c.json({ received: true });
  } catch (error: any) {
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

app.get('/analytics/revenue', requireServiceAuth, async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT DATE(created_at) as date, SUM(amount) as revenue 
       FROM transactions 
       WHERE status = 'SUCCEEDED' 
       GROUP BY DATE(created_at) 
       ORDER BY date DESC 
       LIMIT 30`
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch revenue analytics' }, 500);
  }
});

app.get('/analytics/conversion', requireServiceAuth, async (c) => {
  try {
    const { results } = await c.get('DB').prepare(
      `SELECT 
         DATE(created_at) as date,
         COUNT(id) as total_sessions,
         SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid_sessions
       FROM sessions
       GROUP BY DATE(created_at)
       ORDER BY date DESC
       LIMIT 30`
    ).all();
    
    const data = results.map((row: any) => ({
      ...row,
      conversion_rate: row.total_sessions > 0 ? (row.paid_sessions / row.total_sessions) * 100 : 0
    }));

    return c.json({ success: true, data });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch conversion analytics' }, 500);
  }
});

app.get('/analytics/dashboard', requireServiceAuth, async (c) => {
  try {
    const db = c.get('DB');
    
    // Fetch read models instead of legacy tables
    const { results: orderState } = await db.prepare(
      `SELECT * FROM order_state ORDER BY created_at DESC LIMIT 500`
    ).all();
    
    const { results: paymentState } = await db.prepare(
      `SELECT * FROM payment_state ORDER BY processed_at DESC LIMIT 500`
    ).all();
    
    const { results: commissionState } = await db.prepare(
      `SELECT * FROM commission_state`
    ).all();

    return c.json({ 
      success: true, 
      data: {
        orderState,
        paymentState,
        commissionState
      }
    });
  } catch (error: any) {
    return c.json({ error: 'Failed to fetch dashboard read models' }, 500);
  }
});

export default app;
