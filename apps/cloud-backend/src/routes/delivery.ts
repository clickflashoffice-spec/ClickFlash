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
    const magicUrl = `https://gallery.clickflash.app/magic?token=${token}&session=${guestSessionId}`;

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

export default app;
