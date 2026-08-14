import { SyncPipeline, SyncContext, PipelineResult } from '../SyncPipeline';
import crypto from 'crypto';

const fetchFn = (globalThis as any).fetch;

export class OrdersPipeline implements SyncPipeline {
  name = 'orders_to_gallery';

  async execute(context: SyncContext): Promise<PipelineResult> {
    try {
      const pendingOrders = context.dbManager.query<any>(`
        SELECT o.*, a.title as albumTitle 
        FROM orders o
        LEFT JOIN albums a ON o.albumId = a.id
        WHERE o.status = 'paid' AND (o.cloud_sync_status IS NULL OR o.cloud_sync_status = 'pending' OR o.cloud_sync_status = 'failed')
        LIMIT 10
      `);

      if (pendingOrders.length === 0) return { name: this.name, success: true };

      context.logger.info(
        `[CloudSync] Syncing ${pendingOrders.length} orders to Gallery/Hub...`,
      );

      let successCount = 0;

      for (const order of pendingOrders) {
        const correlationId = `cf_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const orderStartTime = Date.now();
        
        try {
          const orderData = {
            correlationId,
            id: order.id,
            orderNumber: order.orderNumber || order.id,
            date: order.date,
            status: order.status,
            clientName: order.clientName,
            email: order.email,
            albumId: order.albumId,
            albumTitle: order.albumTitle,
            totalAmount: order.total || order.totalAmount || 0,
            items: order.items,
            photographerId: order.photographerId,
            original_id: order.id,
            access_pin: order.access_pin,
            magic_link_token: order.magic_link_token,
          };

          (context.auditService as any).logOrderSyncEvent({
            event: 'ORDER_SYNCED',
            correlationId,
            orderId: order.id,
            albumId: order.albumId,
            customerEmail: order.email,
            photoCount: order.items ? JSON.parse(order.items).length : 0,
            totalAmount: order.total || order.totalAmount || 0,
          });

          const res = await fetchFn(
            `${context.cloudApiUrl}/api/cloud/sync/order`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${context.token}`,
                "Content-Type": "application/json",
                "X-Correlation-ID": correlationId,
              },
              body: JSON.stringify({
                desk_id: context.deskId,
                order: orderData,
              }),
            },
          );

          if (res.ok) {
            const data = (await res.json()) as any;

            context.dbManager.run(
              `UPDATE orders SET 
                 cloud_sync_status = 'synced', 
                 cloud_sync_error = NULL, 
                 access_pin = COALESCE(access_pin, ?),
                 sync_status = 'synced' 
               WHERE id = ?`,
              [data.accessPin || null, order.id],
            );
            
            const duration = Date.now() - orderStartTime;
            
            (context.auditService as any).logOrderSyncEvent({
              event: 'ORDER_SYNCED',
              correlationId,
              orderId: order.id,
              albumId: order.albumId,
              customerEmail: order.email,
              photoCount: order.items ? JSON.parse(order.items).length : 0,
              totalAmount: order.total || order.totalAmount || 0,
              galleryOrderId: data.galleryOrderId || data.orderId,
              duration,
            });
            
            context.logger.info(
              `[CloudSync] Order ${order.id} synced to Hub successfully. [${correlationId}] (${duration}ms)`,
            );
            successCount++;
          } else {
            const txt = await res.text();
            const duration = Date.now() - orderStartTime;
            
            (context.auditService as any).logOrderSyncEvent({
              event: 'ORDER_FAILED',
              correlationId,
              orderId: order.id,
              albumId: order.albumId,
              customerEmail: order.email,
              error: txt,
              duration,
            });
            
            context.logger.error(
              `[CloudSync] Failed to sync order ${order.id}: ${txt} [${correlationId}]`,
            );
            context.dbManager.run(
              `UPDATE orders SET cloud_sync_status = 'failed', cloud_sync_error = ? WHERE id = ?`,
              [txt, order.id],
            );
          }
        } catch (e: any) {
          const duration = Date.now() - orderStartTime;
          
          (context.auditService as any).logOrderSyncEvent({
            event: 'ORDER_FAILED',
            correlationId,
            orderId: order.id,
            albumId: order.albumId,
            error: e.message,
            duration,
          });
          
          context.logger.error(
            `[CloudSync] Error syncing order ${order.id}: ${e.message || String(e)} [${correlationId}]`,
          );
          context.dbManager.run(
            `UPDATE orders SET cloud_sync_status = 'failed', cloud_sync_error = ? WHERE id = ?`,
            [e.message, order.id],
          );
        }
      }
      
      // We consider the pipeline run successful even if some specific orders failed (they are logged and tracked per-order)
      return { name: this.name, success: true };
    } catch (e: any) {
      context.logger.error(`[CloudSync] syncOrdersToGallery error: ${e.message || String(e)}`);
      throw e;
    }
  }
}
