/**
 * Data Export Service
 * GDPR Art. 20 - Right to data portability
 * CCPA §1798.100 - Right to know what data is collected
 */

export interface DataExportRequest {
  id: string;
  userId: string;
  email: string;
  status: ExportStatus;
  requestedAt: Date;
  completedAt?: Date;
  format: ExportFormat;
  dataCategories: DataCategory[];
  verified: boolean;
}

export type ExportStatus = 
  | 'pending'
  | 'verified'
  | 'processing'
  | 'ready'
  | 'delivered'
  | 'expired'
  | 'failed';

export type ExportFormat = 'json' | 'csv' | 'xml' | 'pdf';

export type DataCategory = 
  | 'account'
  | 'profile'
  | 'orders'
  | 'photos'
  | 'payments'
  | 'communications'
  | 'preferences'
  | 'activity'
  | 'invoices';

export interface DataExport {
  requestId: string;
  userId: string;
  generatedAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
  format: ExportFormat;
  metadata: ExportMetadata;
  data: ExportData;
}

export interface ExportMetadata {
  generatedBy: 'automated_system';
  version: string;
  totalRecords: number;
  totalSize: string;
  categories: DataCategory[];
}

export interface ExportData {
  account?: object;
  profile?: object;
  orders?: object[];
  photos?: object[];
  payments?: object[];
  communications?: object[];
  preferences?: object;
  activity?: object[];
  invoices?: object[];
}

class DataExportService {
  private requests: Map<string, DataExportRequest> = new Map();
  private exports: Map<string, DataExport> = new Map();
  private readonly EXPIRY_HOURS = 72;

  /**
   * Submit data export request (GDPR Art. 20)
   */
  submitRequest(params: {
    userId: string;
    email: string;
    format?: ExportFormat;
    dataCategories?: DataCategory[];
  }): DataExportRequest {
    const existing = this.getActiveRequest(params.userId);
    if (existing) {
      return existing; // Return existing active request
    }

    const request: DataExportRequest = {
      id: crypto.randomUUID(),
      userId: params.userId,
      email: params.email,
      status: 'pending',
      requestedAt: new Date(),
      format: params.format || 'json',
      dataCategories: params.dataCategories || this.getDefaultCategories(),
      verified: false
    };

    this.requests.set(params.userId, request);
    return request;
  }

  /**
   * Verify and process export request
   */
  async processRequest(userId: string): Promise<DataExport> {
    const request = this.getActiveRequest(userId);
    if (!request) {
      throw new Error('No active export request found');
    }

    request.status = 'processing';
    request.verified = true;

    // Gather all data
    const data: ExportData = {};

    for (const category of request.dataCategories) {
      data[category] = await this.gatherData(userId, category);
    }

    const totalRecords = Object.values(data).flat().length;
    
    const exportRecord: DataExport = {
      requestId: request.id,
      userId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000),
      format: request.format,
      metadata: {
        generatedBy: 'automated_system',
        version: '1.0',
        totalRecords,
        totalSize: this.estimateSize(data),
        categories: request.dataCategories
      },
      data
    };

    this.exports.set(request.id, exportRecord);
    request.status = 'ready';
    
    return exportRecord;
  }

  /**
   * Generate downloadable file
   */
  generateFile(requestId: string): { content: string; filename: string; contentType: string } {
    const exportRecord = this.exports.get(requestId);
    if (!exportRecord) {
      throw new Error('Export not found');
    }

    if (new Date() > exportRecord.expiresAt) {
      throw new Error('Export expired');
    }

    let content: string;
    let filename: string;
    let contentType: string;

    switch (exportRecord.format) {
      case 'json':
        content = JSON.stringify(exportRecord, null, 2);
        filename = `clickflash-data-export-${exportRecord.generatedAt.toISOString().split('T')[0]}.json`;
        contentType = 'application/json';
        break;
      case 'csv':
        content = this.convertToCSV(exportRecord.data);
        filename = `clickflash-data-export-${exportRecord.generatedAt.toISOString().split('T')[0]}.csv`;
        contentType = 'text/csv';
        break;
      default:
        throw new Error(`Unsupported format: ${exportRecord.format}`);
    }

    return { content, filename, contentType };
  }

  /**
   * Get active request for user
   */
  getActiveRequest(userId: string): DataExportRequest | undefined {
    const request = this.requests.get(userId);
    if (!request) return undefined;
    if (['delivered', 'expired', 'failed'].includes(request.status)) return undefined;
    return request;
  }

  /**
   * Get export by request ID
   */
  getExport(requestId: string): DataExport | undefined {
    return this.exports.get(requestId);
  }

  /**
   * Mark export as delivered
   */
  markDelivered(requestId: string): void {
    const request = Array.from(this.requests.values()).find(r => r.id === requestId);
    if (request) {
      request.status = 'delivered';
      request.completedAt = new Date();
    }
  }

  /**
   * Expire old exports
   */
  expireOldExports(): void {
    const now = new Date();
    this.exports.forEach((exportRecord, requestId) => {
      if (now > exportRecord.expiresAt) {
        const request = Array.from(this.requests.values()).find(r => r.id === requestId);
        if (request) {
          request.status = 'expired';
        }
      }
    });
  }

  private getDefaultCategories(): DataCategory[] {
    return ['account', 'profile', 'orders', 'photos', 'payments', 'preferences'];
  }

  private async gatherData(userId: string, category: DataCategory): Promise<object | object[]> {
    // Implementation would fetch actual user data
    return [];
  }

  private estimateSize(data: ExportData): string {
    const bytes = JSON.stringify(data).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private convertToCSV(data: ExportData): string {
    const rows: string[] = ['Category,Data'];
    
    for (const [category, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        for (const record of records) {
          rows.push(`${category},"${JSON.stringify(record).replace(/"/g, '""')}"`);
        }
      } else if (records) {
        rows.push(`${category},"${JSON.stringify(records).replace(/"/g, '""')}"`);
      }
    }
    
    return rows.join('\n');
  }
}

export const dataExportService = new DataExportService();
