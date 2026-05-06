// apps/master/backend/services/auditService.ts
/**
 * Audit Service - 360° Upload/Sync Audit Trail
 * 
 * Provides correlation IDs and structured audit logging for:
 * - Order lifecycle (Master → Touch → Gallery)
 * - Photo uploads (Master → Gallery Cloud)
 * - Sales sync (Master → Management Cloud)
 */

import { Logger } from "../shared/logger";
import crypto from 'crypto';

export interface AuditContext {
  correlationId: string;
  locationId: string;
  orderId?: string;
  albumId?: string;
  photographerId?: string;
  customerEmail?: string;
  timestamp: string;
}

export interface UploadAuditEvent {
  event: 'UPLOAD_STARTED' | 'UPLOAD_PROGRESS' | 'UPLOAD_COMPLETE' | 'UPLOAD_FAILED';
  correlationId: string;
  orderId?: string;
  photoId?: string;
  fileName?: string;
  fileSize?: number;
  bytesUploaded?: number;
  error?: string;
  duration?: number;
}

export interface OrderSyncAuditEvent {
  event: 'ORDER_CREATED' | 'ORDER_EXPORTED' | 'ORDER_SYNCED' | 'ORDER_ACTIVATED' | 'ORDER_FAILED';
  correlationId: string;
  orderId: string;
  albumId?: string;
  customerEmail?: string;
  photoCount?: number;
  totalAmount?: number;
  galleryOrderId?: string;
  error?: string;
  duration?: number;
}

export interface SalesSyncAuditEvent {
  event: 'SALES_SYNC_STARTED' | 'SALES_SYNC_COMPLETE' | 'SALES_SYNC_FAILED';
  correlationId: string;
  date: string;
  photographerId?: string;
  importedPhotos?: number;
  soldPhotos?: number;
  salesRevenue?: number;
  totalCustomers?: number;
  error?: string;
  duration?: number;
}

export class AuditService {
  private logger: Logger;
  private auditDb: any; // SQLite for audit
  
  constructor(logger: Logger, dbManager?: any) {
    this.logger = logger;
    this.auditDb = dbManager;
  }

  /**
   * Generate new correlation ID for tracking across services
   */
  generateCorrelationId(): string {
    return `cf_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create audit context for an order lifecycle
   */
  createOrderContext(orderId: string, albumId?: string, locationId?: string): AuditContext {
    return {
      correlationId: this.generateCorrelationId(),
      locationId: locationId || process.env.LOCATION_SLUG || 'unknown',
      orderId,
      albumId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log upload audit event
   */
  logUploadEvent(event: UploadAuditEvent): void {
    const logEntry = {
      type: 'UPLOAD_AUDIT',
      ...event,
      loggedAt: new Date().toISOString(),
    };
    
    this.logger.info(`[AUDIT:UPLOAD] ${event.event}`, logEntry);
    
    // Store in audit DB if available
    if (this.auditDb) {
      try {
        this.auditDb.run(
          `INSERT INTO audit_uploads (correlation_id, event, order_id, photo_id, file_name, file_size, bytes_uploaded, error, duration, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.correlationId,
            event.event,
            event.orderId,
            event.photoId,
            event.fileName,
            event.fileSize,
            event.bytesUploaded,
            event.error,
            event.duration,
            new Date().toISOString()
          ]
        );
      } catch (err: any) {
        this.logger.error('[AUDIT] Failed to write upload audit', { error: err.message });
      }
    }
  }

  /**
   * Log order sync audit event
   */
  logOrderSyncEvent(event: OrderSyncAuditEvent): void {
    const logEntry = {
      type: 'ORDER_SYNC_AUDIT',
      ...event,
      loggedAt: new Date().toISOString(),
    };
    
    this.logger.info(`[AUDIT:ORDER] ${event.event}`, logEntry);
    
    if (this.auditDb) {
      try {
        this.auditDb.run(
          `INSERT INTO audit_order_sync (correlation_id, event, order_id, album_id, customer_email, photo_count, total_amount, gallery_order_id, error, duration, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.correlationId,
            event.event,
            event.orderId,
            event.albumId,
            event.customerEmail,
            event.photoCount,
            event.totalAmount,
            event.galleryOrderId,
            event.error,
            event.duration,
            new Date().toISOString()
          ]
        );
      } catch (err: any) {
        this.logger.error('[AUDIT] Failed to write order sync audit', { error: err.message });
      }
    }
  }

  /**
   * Log sales sync audit event
   */
  logSalesSyncEvent(event: SalesSyncAuditEvent): void {
    const logEntry = {
      type: 'SALES_SYNC_AUDIT',
      ...event,
      loggedAt: new Date().toISOString(),
    };
    
    this.logger.info(`[AUDIT:SALES] ${event.event}`, logEntry);
    
    if (this.auditDb) {
      try {
        this.auditDb.run(
          `INSERT INTO audit_sales_sync (correlation_id, event, sync_date, photographer_id, imported_photos, sold_photos, sales_revenue, total_customers, error, duration, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.correlationId,
            event.event,
            event.date,
            event.photographerId,
            event.importedPhotos,
            event.soldPhotos,
            event.salesRevenue,
            event.totalCustomers,
            event.error,
            event.duration,
            new Date().toISOString()
          ]
        );
      } catch (err: any) {
        this.logger.error('[AUDIT] Failed to write sales sync audit', { error: err.message });
      }
    }
  }

  /**
   * Get audit trail for an order
   */
  getOrderAuditTrail(orderId: string): any[] {
    if (!this.auditDb) return [];
    
    const uploads = this.auditDb.query(
      'SELECT * FROM audit_uploads WHERE order_id = ? ORDER BY created_at',
      [orderId]
    ) || [];
    
    const orders = this.auditDb.query(
      'SELECT * FROM audit_order_sync WHERE order_id = ? ORDER BY created_at',
      [orderId]
    ) || [];
    
    return [...uploads, ...orders].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  /**
   * Get audit trail by correlation ID
   */
  getByCorrelationId(correlationId: string): any[] {
    if (!this.auditDb) return [];
    
    const uploads = (this.auditDb.query(
      'SELECT * FROM audit_uploads WHERE correlation_id = ?',
      [correlationId]
    ) || []);
    
    const orders = (this.auditDb.query(
      'SELECT * FROM audit_order_sync WHERE correlation_id = ?',
      [correlationId]
    ) || []);
    
    const sales = (this.auditDb.query(
      'SELECT * FROM audit_sales_sync WHERE correlation_id = ?',
      [correlationId]
    ) || []);
    
    return [...uploads, ...orders, ...sales].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }
}

export default AuditService;
