import { Hono } from 'hono';
import { Resend } from 'resend';
import type { AppEnv, Bindings } from './types';
import { corsMiddleware, regionRoutingMiddleware, getRegionalDB } from './middleware';
import { analyzeImageWithGemini } from './services/gemini-tagger';

import galleryRoutes from './routes/gallery';
import ingestRoutes from './routes/ingest';
import fleetRoutes from './routes/fleet';
import sessionsRoutes from './routes/sessions';
import ordersRoutes from './routes/orders';
import photographersRoutes from './routes/photographers';
import settingsRoutes from './routes/settings';
import intelligenceRoutes from './routes/intelligence';
import emailRoutes from './routes/email';
import healthRoutes from './routes/health';

const app = new Hono<AppEnv>();

app.use('*', corsMiddleware);
app.use('*', regionRoutingMiddleware);

app.get('/', (c) => c.text('ClickFlash Cloud Backend API is running!'));

app.route('/api/gallery-auth', galleryRoutes);
app.route('/api', galleryRoutes); // qr, photos
app.route('/api/ingest', ingestRoutes);
app.route('/api', fleetRoutes); // masters, cloud/fleet
app.route('/api', sessionsRoutes); // sync, sessions
app.route('/api', ordersRoutes); // webhooks, analytics
app.route('/api', photographersRoutes); // shifts, photographers
app.route('/api', settingsRoutes); // settings, cloud/sync, cloud/config, franchise, resort, stations, payroll
app.route('/api/ai', intelligenceRoutes);
app.route('/api', emailRoutes); // notifications, push-token
app.route('/api/health', healthRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: ExecutionContext): Promise<void> {
    const db = getRegionalDB(env, 'MENA');
    const resend = new Resend(env.RESEND_API_KEY);
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { results } = await db.prepare(
      `SELECT * FROM sessions 
       WHERE status != 'PAID' 
       AND created_at < ? 
       AND abandoned_email_sent = 0
       AND customer_email IS NOT NULL`
    ).bind(oneHourAgo).all();

    for (const session of results) {
      try {
        await resend.emails.send({
          from: 'ClickFlash <no-reply@clickflash.com>',
          to: session.customer_email as string,
          subject: 'Your memories are waiting!',
          html: `<p>Hi ${session.guest_name || 'Guest'},</p><p>You left some amazing photos in your cart. Come back to ClickFlash and complete your order before they expire!</p>`
        });

        if (session.push_token) {
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: session.push_token,
                title: 'Your memories are waiting! ⏳',
                body: 'Come back to ClickFlash and complete your order before they expire!',
                data: { sessionId: session.id }
              })
            });
          } catch (e) {
            // Error logged silently
          }
        }

        await db.prepare(
          `UPDATE sessions SET abandoned_email_sent = 1 WHERE id = ?`
        ).bind(session.id).run();
      } catch (e) {
        // Error logged silently
      }
    }
  },
  async queue(batch: MessageBatch<any>, env: Bindings): Promise<void> {
    for (const msg of batch.messages) {
      try {
        const object = await env.PHOTO_BUCKET.get(msg.body.r2Path);
        if (!object) {
          msg.ack();
          continue;
        }

        const buffer = await object.arrayBuffer();

        const tags = await analyzeImageWithGemini(
          buffer, 
          msg.body.mimeType || 'image/jpeg', 
          env.GEMINI_API_KEY
        );
        
        const db = getRegionalDB(env, msg.body.regionId);
        await db.prepare(`UPDATE photos SET ai_tags = ?, quality_score = ?, curation_status = ? WHERE id = ?`)
          .bind(JSON.stringify(tags), tags.quality_score || null, tags.curation_status || 'PENDING', msg.body.photoId)
          .run();
          
        msg.ack();
      } catch (err: any) {
        msg.retry();
      }
    }
  }
};
