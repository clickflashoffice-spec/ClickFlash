import { Hono } from 'hono';
import { Resend } from 'resend';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

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

    const resend = new Resend(c.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'ClickFlash <no-reply@clickflash.com>',
      to: session.customer_email as string,
      subject: 'Your photos are ready!',
      html: `<p>Hi ${session.guest_name || 'Guest'},</p><p>Your photos from today's session are now ready to view and download!</p>`
    });

    if (session.push_token) {
      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: session.push_token,
            title: 'Your photos are ready! 📸',
            body: 'Tap here to view and download your memories.',
            data: { sessionId: session.id }
          })
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
