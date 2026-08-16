import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/magic-link', async (c) => {
  try {
    const { phone, channel, guestSessionId } = await c.req.json();
    if (!phone || !guestSessionId) {
      return c.json({ error: 'Missing phone or guestSessionId' }, 400);
    }

    const token = crypto.randomUUID();
    const webrtcAuth = crypto.randomUUID();
    const magicUrl = `https://gallery.clickflash.app/magic?token=${token}&session=${guestSessionId}&webrtcAuth=${webrtcAuth}`;

    if (c.env.DELIVERY_TOKENS) {
      await c.env.DELIVERY_TOKENS.put(token, JSON.stringify({ guestSessionId, phone, channel, webrtcAuth }), { expirationTtl: 86400 });
    }

    // Log & simulate WhatsApp/SMS delivery via Resend or SMS provider
    console.log(`[CloudBackend:Delivery] Sending ${channel || 'WHATSAPP'} magic link to ${phone}: ${magicUrl}`);

    return c.json({
      success: true,
      magicUrl,
      deliveredTo: phone,
      channel: channel || 'WHATSAPP',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({ error: 'Delivery failed', message: error.message }, 500);
  }
});


app.get('/verify/:token', async (c) => {
  try {
    const token = c.req.param('token');
    if (!c.env.DELIVERY_TOKENS) {
      return c.json({ error: 'KV not configured' }, 500);
    }
    const data = await c.env.DELIVERY_TOKENS.get(token);
    if (!data) {
      return c.json({ error: 'Token expired or invalid' }, 404);
    }
    return c.json({ success: true, session: JSON.parse(data) });
  } catch (error: any) {
    return c.json({ error: 'Verification failed', message: error.message }, 500);
  }
});

export default app;
