import type { D1Database } from '@cloudflare/workers-types';

export interface PhotographerEvent {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: string;
  created_at: string;
  processed: number;
  photographer_id?: string;
}

export async function projectLedgerEvents(db: D1Database): Promise<void> {
  const { results: events } = await db.prepare(
    `SELECT * FROM photographer_events_v1 WHERE processed = 0 ORDER BY created_at ASC LIMIT 100`
  ).all<PhotographerEvent>();

  if (!events || events.length === 0) return;

  for (const event of events) {
    const payload = JSON.parse(event.payload);

    try {
      switch (event.event_type) {
        case 'ORDER_COMPLETED':
          await db.prepare(
            `INSERT INTO order_state (id, photographer_id, session_id, status, total_amount, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`
          ).bind(
            payload.orderId || event.aggregate_id,
            event.photographer_id || payload.photographerId || null,
            payload.session_id || null,
            'COMPLETED',
            payload.gross?.amountMinor || 0,
            event.created_at,
            event.created_at
          ).run();
          break;

        case 'PAYMENT_CAPTURED':
          await db.prepare(
            `INSERT INTO payment_state (id, order_id, amount, status, processed_at) VALUES (?, ?, ?, ?, ?)`
          ).bind(
            payload.paymentId || crypto.randomUUID(),
            payload.orderId || event.aggregate_id,
            payload.amount?.amountMinor || 0,
            'CAPTURED',
            event.created_at
          ).run();

          await db.prepare(
            `UPDATE order_state SET status = 'PAID', updated_at = ? WHERE id = ?`
          ).bind(event.created_at, payload.orderId || event.aggregate_id).run();
          break;
          
        case 'REFUND_POSTED':
          await db.prepare(
            `UPDATE payment_state SET status = 'REFUNDED', processed_at = ? WHERE id = ?`
          ).bind(event.created_at, payload.paymentId).run();
          
          await db.prepare(
            `UPDATE order_state SET status = 'REFUNDED', updated_at = ? WHERE id = ?`
          ).bind(event.created_at, payload.orderId || event.aggregate_id).run();
          break;
          
        case 'ATTRIBUTION_ASSIGNED':
          // Update order with attribution details
          break;
      }

      await db.prepare(`UPDATE photographer_events_v1 SET processed = 1 WHERE id = ?`).bind(event.id).run();
    } catch (err) {
      console.error(`Failed to process event ${event.id}:`, err);
    }
  }
}
