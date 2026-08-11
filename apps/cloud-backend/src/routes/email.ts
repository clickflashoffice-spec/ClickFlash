import { Hono } from 'hono';
import { requireServiceAuth } from '../auth';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();
app.use('*', requireServiceAuth);

app.post('/notifications/ready', async (c) => {
  try {
    const { sessionId } = await c.req.json();
    if (!sessionId) return c.json({ error: 'Missing sessionId' }, 400);

    const session = await c.get('DB').prepare(
      `SELECT * FROM sessions WHERE id = ?`
    ).bind(sessionId).first();

    if (!session || !session.customer_email) {
      return c.json({ error: 'Session not found or missing customer_email' }, 404);
    }

    const emailSubject = 'Your photos are ready! 📸';
    const emailHtml = `<div style="font-family: sans-serif; padding: 20px;">
      <h2>Hi ${session.guest_name || 'Guest'},</h2>
      <p>Your photos from today's session are now ready to view and download!</p>
      <p><a href="https://gallery.clicketflash.com/session/${session.id}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Gallery</a></p>
    </div>`;

    // 1. Direct Resend API Delivery
    if (c.env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ClickFlash <no-reply@clicketflash.com>',
          to: [session.customer_email as string],
          subject: emailSubject,
          html: emailHtml,
        }),
      }).catch(() => {});
    } else if (c.env.MANAGEMENT_BACKEND_URL) {
      // 2. Management Backend Relay Fallback
      await fetch(`${c.env.MANAGEMENT_BACKEND_URL}/api/email/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: session.customer_email as string,
          from: 'ClickFlash <no-reply@clicketflash.com>',
          subject: emailSubject,
          html: emailHtml,
        }),
      }).catch(() => {});
    }

    // 3. Expo Push Notification
    if (session.push_token) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: session.push_token,
            title: emailSubject,
            body: 'Tap here to view and download your memories.',
            data: { sessionId: session.id },
          }),
        });
      } catch (e) {
        // Log silently
      }
    }

    await c.get('DB').prepare(
      `UPDATE sessions SET notified_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(sessionId).run();

    return c.json({ success: true, message: 'Ready notification sent' });
  } catch (error: any) {
    return c.json({ error: 'Failed to send notification' }, 500);
  }
});

app.post('/push-token', async (c) => {
  try {
    const { sessionId, pushToken } = await c.req.json();
    if (!sessionId || !pushToken) return c.json({ error: 'Missing sessionId or pushToken' }, 400);

    await c.get('DB').prepare(
      `UPDATE sessions SET push_token = ? WHERE id = ?`
    ).bind(pushToken, sessionId).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Failed to save push token' }, 500);
  }
});

export default app;
