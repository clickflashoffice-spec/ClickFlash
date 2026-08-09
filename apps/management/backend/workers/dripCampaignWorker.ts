import type { D1Database, ExecutionContext } from '@cloudflare/workers-types';
import { logger } from '@/utils/logger';

export interface Env {
  DB: D1Database;
}

export default {
  // CRON Trigger Handler
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    logger.info(`[DripCampaignWorker] Cron triggered at ${new Date(controller.scheduledTime).toISOString()}`);

    try {
      // 1. Process Abandoned Carts
      await processAbandonedCarts(env);

      // 2. Process Gallery Views without purchases (e.g., 24h follow-up)
      await processGalleryFollowUps(env);

    } catch (error) {
      logger.error('[DripCampaignWorker] Error processing campaigns:', error);
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
      const sent = await queueEmail(
        env.DB,
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
    logger.warn('Abandoned cart processing skipped or failed', e);
  }
}

async function processGalleryFollowUps(env: Env) {
  // Similar logic for finding guests who viewed a gallery but bought nothing
  // Mock implementation
  logger.info('[DripCampaignWorker] Processing gallery follow-ups...');
}

async function queueEmail(db: D1Database, to: string, subject: string, html: string): Promise<boolean> {
  try {
    // Ensure table exists (in a real app this is part of migrations)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS email_outbox (
        id TEXT PRIMARY KEY,
        recipient TEXT NOT NULL,
        sender TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        bcc TEXT,
        subject TEXT NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        error_log TEXT
      )
    `).run();

    const emailId = crypto.randomUUID();
    const textContent = html.replace(/<[^>]*>?/gm, ' ').trim();
    const sender = 'hello@clickflash.app';
    const senderName = 'ClickFlash';

    await db.prepare(`
      INSERT INTO email_outbox (id, recipient, sender, sender_name, subject, html_content, text_content)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(emailId, to, sender, senderName, subject, html, textContent).run();
    
    return true;
  } catch (err) {
    logger.error('Failed to queue email to D1 Outbox', err);
    return false;
  }
}
