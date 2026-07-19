import { logger } from "@clickflash/logger";

// Management Worker audit service.
/**
 * Audit Service for Management Cloud
 * Provides structured audit logging for analytics operations
 */

interface AuditLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;
  correlationId?: string;
  deskId?: string;
  data: Record<string, any>;
  service: 'management-cloud';
}

export class ManagementAuditService {
  private logs: AuditLogEntry[] = [];

  constructor() {
    // In Cloudflare Workers, logs are typically emitted to stdout
    // and captured by Cloudflare's logging system
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', event: string, data: Record<string, any> = {}): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      data,
      service: 'management-cloud',
    };
    
    // Console output for Cloudflare Workers
    const logLine = JSON.stringify(entry);
    if (level === 'ERROR') {
      logger.error(String(`[AUDIT] ${logLine}`));
    } else {
      logger.info(String(`[AUDIT] ${logLine}`));
    }
    
    // Also store in memory for potential retrieval
    this.logs.push(entry);
    
    // Keep only last 1000 entries
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  logDailyAuditReceived(deskId: string, date: string, auditCount: number, correlationId?: string): void {
    this.log('INFO', 'DAILY_AUDIT_RECEIVED', {
      correlationId,
      deskId,
      date,
      auditCount,
      receivedAt: new Date().toISOString(),
    });
  }

  logDailyAuditProcessed(deskId: string, date: string, processed: number, correlationId?: string): void {
    this.log('INFO', 'DAILY_AUDIT_PROCESSED', {
      correlationId,
      deskId,
      date,
      processed,
      processedAt: new Date().toISOString(),
    });
  }

  logSalesIngest(deskId: string, revenue: number, orderCount: number, correlationId?: string): void {
    this.log('INFO', 'SALES_INGEST', {
      correlationId,
      deskId,
      revenue,
      orderCount,
      ingestedAt: new Date().toISOString(),
    });
  }

  logResortBIIngest(deskId: string, dataType: string, correlationId?: string): void {
    this.log('INFO', 'RESORT_BI_INGEST', {
      correlationId,
      deskId,
      dataType,
      ingestedAt: new Date().toISOString(),
    });
  }

  logError(operation: string, error: string, context: Record<string, any> = {}): void {
    this.log('ERROR', 'AUDIT_ERROR', {
      operation,
      error,
      ...context,
    });
  }

  getRecentLogs(count: number = 100): AuditLogEntry[] {
    return this.logs.slice(-count);
  }
}

export default ManagementAuditService;
