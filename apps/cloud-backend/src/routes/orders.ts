import { Hono } from 'hono';
import { Resend } from 'resend';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/webhooks/stripe', async (c) => {
  try {
    const body = await c.req.json();
    const eventType = body.type;

    if (eventType === 'payment_intent.succeeded') {
      const paymentIntent = body.data.object;
      const sessionId = paymentIntent.metadata?.sessionId;

      if (sessionId) {
        await c.get('DB').prepare(
          `INSERT INTO transactions (id, session_id, stripe_payment_intent_id, amount, currency, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), sessionId, paymentIntent.id, paymentIntent.amount, paymentIntent.currency, 'SUCCEEDED', Date.now()).run();

        await c.get('DB').prepare(
          `UPDATE sessions SET status = 'PAID' WHERE id = ?`
        ).bind(sessionId).run();

        const sessionRow = await c.get('DB').prepare(
          `SELECT customer_email, guest_name FROM sessions WHERE id = ?`
        ).bind(sessionId).first();

        if (sessionRow && sessionRow.customer_email) {
          const resend = new Resend(c.env.RESEND_API_KEY);
          try {
            await resend.emails.send({
              from: 'ClickFlash Orders <orders@clickflash.com>',
              to: sessionRow.customer_email as string,
              subject: 'Your ClickFlash Gallery is Ready!',
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2>Hi ${sessionRow.guest_name || 'Guest'},</h2>
                  <p>Your payment was successful and your digital photo gallery is now unlocked!</p>
                  <p>You can view and download your high-resolution photos securely using the link below:</p>
                  <div style="margin: 30px 0;">
                    <a href="https://gallery.clickflash.com/session/${sessionId}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                      View My Gallery
                    </a>
                  </div>
                  <p>Thank you for choosing ClickFlash!</p>
                </div>
              `
            });
          } catch (emailErr) {
            // Log silently
          }
        }
      }
    }

    return c.json({ received: true });
  } catch (error: any) {
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

app.get('/analytics/revenue', async (c) => {
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

app.get('/analytics/conversion', async (c) => {
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

export default app;
