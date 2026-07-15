import type { D1Database, ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

export default {
  // CRON Trigger Handler
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[DripCampaignWorker] Cron triggered at ${new Date(controller.scheduledTime).toISOString()}`);

    try {
      // 1. Process Abandoned Carts
      await processAbandonedCarts(env);

      // 2. Process Gallery Views without purchases (e.g., 24h follow-up)
      await processGalleryFollowUps(env);

    } catch (error) {
      console.error('[DripCampaignWorker] Error processing campaigns:', error);
    }
  },
};

async function processAbandonedCarts(env: Env) {
  // Find carts created > 2 hours ago but < 24 hours ago that haven't been completed or emailed
  const query = `
    SELECT c.id, c.email, c.gallery_id, c.items
    FROM carts c
    WHERE c.status = 'abandoned'
      AND c.created_at < datetime('now', '-2 hours')
      AND c.created_at > datetime('now', '-24 hours')
      AND c.recovery_email_sent = 0
  `;

  try {
    const { results } = await env.DB.prepare(query).all();

    for (const cart of results) {
      const sent = await sendEmail(
        env.RESEND_API_KEY,
        cart.email as string,
        'Did you forget your photos? 📸',
        `<p>Hi there,</p><p>We noticed you left some amazing memories in your cart. <a href="https://clickflash.app/gallery/${cart.gallery_id}">Click here to complete your order!</a></p>`
      );

      if (sent) {
        // Mark as sent
        await env.DB.prepare('UPDATE carts SET recovery_email_sent = 1 WHERE id = ?').bind(cart.id).run();
      }
    }
  } catch (e) {
    // Suppress D1 errors if table doesn't exist yet for this mock
    console.warn('Abandoned cart processing skipped or failed', e);
  }
}

async function processGalleryFollowUps(env: Env) {
  // Similar logic for finding guests who viewed a gallery but bought nothing
  // Mock implementation
  console.log('[DripCampaignWorker] Processing gallery follow-ups...');
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ClickFlash <hello@clickflash.app>',
        to: [to],
        subject,
        html
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send email via Resend', err);
    return false;
  }
}
