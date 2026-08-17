import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { salesSwarm } from '../workers/sales-swarm';
import type { MetaWebhookPayload } from '@clickflash/types';

const app = new Hono<AppEnv>();

/**
 * Verify HMAC-SHA256 signature from Meta Webhooks using Web Crypto API.
 */
async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): Promise<boolean> {
  if (!signatureHeader || !appSecret) {
    // Graceful pass in test/dev environment if secret is not set
    return true;
  }

  try {
    const parts = signatureHeader.split('sha256=');
    if (parts.length !== 2) return false;
    const expectedHashHex = parts[1];

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const calculatedHashHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return calculatedHashHex === expectedHashHex;
  } catch (err) {
    console.error('[WhatsApp Webhook] Signature verification failed:', err);
    return false;
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Meta Webhook Handshake & Verification
 */
app.get('/', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const verifyToken = c.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'clickflash_whatsapp_verify';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verification challenge passed.');
      return c.text(challenge || '', 200);
    } else {
      console.warn('[WhatsApp Webhook] Verification token mismatch.');
      return c.text('Forbidden', 403);
    }
  }

  return c.text('Missing hub parameters', 400);
});

/**
 * POST /api/webhooks/whatsapp
 * Inbound Meta Webhook Event Dispatcher
 */
app.post('/', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256') || c.req.header('X-Hub-Signature-256');
  const appSecret = c.env.WHATSAPP_APP_SECRET;

  const isValid = await verifyMetaSignature(rawBody, signature, appSecret);
  if (!isValid) {
    console.warn('[WhatsApp Webhook] Invalid HMAC-SHA256 signature rejected.');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  if (payload && payload.object) {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // Process inbound messages
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const from = message.from;
            let msgBody = '';

            if (message.type === 'text' && message.text?.body) {
              msgBody = message.text.body;
            } else if (message.type === 'interactive') {
              msgBody =
                message.interactive?.button_reply?.title ||
                message.interactive?.button_reply?.id ||
                message.interactive?.list_reply?.title ||
                '';
            } else if (message.type === 'button') {
              msgBody = message.button?.text || message.button?.payload || '';
            }

            if (from && msgBody) {
              console.log(`[WhatsApp Webhook] Inbound from ${from}: "${msgBody}"`);
              
              // Trigger asynchronous swarm execution with execution context if available
              const executionPromise = salesSwarm.handleIncomingMessage({
                from,
                message: msgBody,
                timestamp: message.timestamp,
                messageId: message.id,
                env: c.env,
                db: c.get('DB') || c.env.DB
              }).catch(err => {
                console.error(`[WhatsApp Webhook] Swarm handling error for ${from}:`, err);
              });

              try {
                c.executionCtx?.waitUntil(executionPromise);
              } catch {
                // Not in Cloudflare Worker runtime (e.g. testing)
              }
            }
          }
        }
      }
    }

    return c.text('EVENT_RECEIVED', 200);
  }

  return c.json({ error: 'Not Found' }, 404);
});

export default app;
