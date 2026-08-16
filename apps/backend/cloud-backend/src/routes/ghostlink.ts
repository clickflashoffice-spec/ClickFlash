import { Hono } from 'hono';
import { Redis } from '@upstash/redis/cloudflare';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

app.post('/init', async (c) => {
  try {
    const body = await c.req.json();
    const { phone, guestSessionId, photoId, initialOffer } = body;

    const redisUrl = c.env.UPSTASH_REDIS_REST_URL;
    const redisToken = c.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (redisUrl && redisToken) {
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      await redis.xadd('clickflash:events', '*', {
        type: 'ghostlink:created',
        phone,
        guestSessionId,
        photoId,
        initialOffer,
        timestamp: new Date().toISOString()
      });
    }

    // Redirect to WhatsApp Business API
    const text = encodeURIComponent(`Hi, here is your ClickFlash offer!`);
    const waUrl = `https://api.whatsapp.com/send/?phone=${phone}&text=${text}`;
    
    // Some implementations might expect a JSON response with the redirect URL,
    // or an actual HTTP redirect. For an API endpoint, returning the URL as JSON is common.
    // The prompt says "redirects to the WhatsApp Business API", so we could also do c.redirect(waUrl).
    // Let's do c.redirect just in case it expects a 302. Actually, if it's POST /init, maybe JSON is safer.
    // Let's return JSON with whatsappUrl and also you can do c.redirect if they POST from a form.
    // But since it's an API, JSON is standard.
    // Let's just return a redirect?
    return c.redirect(waUrl);
  } catch (error: any) {
    return c.json({ error: 'Ghost-Link init failed', message: error.message }, 500);
  }
});

export default app;
