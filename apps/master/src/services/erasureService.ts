/**
 * Right to Erasure Service
 * GDPR Art. 17 - Right to erasure ("right to be forgotten")
 * CCPA §1798.105 - Right to delete
 */

export interface ErasureRequest {
  id: string;
  userId: string;
  email: string;
  status: ErasureStatus;
  requestedAt: Date;
  completedAt?: Date;
  dataCategories: DataCategory[];
  verified: boolean;
  verificationMethod?: 'email' | 'id_document' | 'phone';
  reason?: string;
  notes?: string;
}

export type ErasureStatus = 
  | 'pending'
  | 'pending_verification'
  | 'verified'
  | 'processing'
  | 'completed'
  | 'partially_completed'
  | 'rejected'
  | 'expired';

export type DataCategory = 
  | 'account_data'
  | 'profile_data'
  | 'order_history'
  | 'payment_data'
  | 'photos'
  | 'communications'
  | 'analytics_data'
  | 'marketing_data'
  | 'session_logs'
  | 'backup_data';

export interface ErasureReport {
  requestId: string;
  userId: string;
  requestedAt: Date;
  completedAt: Date;
  dataCategoriesErased: DataCategory[];
  dataCategoriesRetained: { category: DataCategory; reason: string }[];
  certificateNumber: string;
}

class ErasureService {
  private requests: Map<string, ErasureRequest> = new Map();
  private erasureLogs: Map<string, object[]> = new Map();

  /**
   * Submit erasure request (GDPR/CCPA)
   */
  submitRequest(params: {
    userId: string;
    email: string;
    reason?: string;
    dataCategories?: DataCategory[];
  }): ErasureRequest {
    const existing = this.getActiveRequest(params.userId);
    if (existing) {
      throw new Error('Active erasure request already exists');
    }

    const request: ErasureRequest = {
      id: crypto.randomUUID(),
      userId: params.userId,
      email: params.email,
      status: 'pending',
      requestedAt: new Date(),
      dataCategories: params.dataCategories || ['account_data', 'profile_data'],
      verified: false,
      reason: params.reason
    };

    this.requests.set(params.userId, request);
    this.logErasureAction(params.userId, 'REQUEST_SUBMITTED', { requestId: request.id });

    return request;
  }

  /**
   * Verify identity before processing
   */
  verifyRequest(userId: string, method: 'email' | 'id_document' | 'phone'): ErasureRequest {
    const request = this.getActiveRequest(userId);
    if (!request) {
      throw new Error('No active erasure request found');
    }

    request.verified = true;
    request.verificationMethod = method;
    request.status = 'verified';
    
    this.logErasureAction(userId, 'REQUEST_VERIFIED', { method });
    return request;
  }

  /**
   * Process erasure request
   */
  async processErasure(userId: string): Promise<ErasureReport> {
    const request = this.getActiveRequest(userId);
    if (!request) {
      throw new Error('No active erasure request found');
    }

    if (!request.verified) {
      throw new Error('Request not verified');
    }

    request.status = 'processing';
    
    const erasedCategories: DataCategory[] = [];
    const retainedCategories: { category: DataCategory; reason: string }[] = [];

    // Categories that CAN be erased
    const erasableCategories: DataCategory[] = [
      'account_data',
      'profile_data',
      'order_history',
      'communications',
      'marketing_data',
      'session_logs'
    ];

    // Categories that MUST be retained (legal obligations)
    const retainedByLaw: DataCategory[] = [
      'payment_data', // Tax/financial regulations
      'photos' // May be required for legal claims
    ];

    // Categories that should be anonymized rather than deleted
    const anonymizeInstead: DataCategory[] = [
      'analytics_data',
      'backup_data'
    ];

    for (const category of request.dataCategories) {
      if (erasableCategories.includes(category)) {
        await this.eraseDataCategory(userId, category);
        erasedCategories.push(category);
      } else if (retainedByLaw.includes(category)) {
        retainedCategories.push({ 
          category, 
          reason: 'Required for legal/tax compliance' 
        });
      } else if (anonymizeInstead.includes(category)) {
        await this.anonymizeData(userId, category);
        erasedCategories.push(category);
      }
    }

    request.status = retainedCategories.length > 0 ? 'partially_completed' : 'completed';
    request.completedAt = new Date();

    const report: ErasureReport = {
      requestId: request.id,
      userId,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      dataCategoriesErased: erasedCategories,
      dataCategoriesRetained: retainedCategories,
      certificateNumber: `ERASURE-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    };

    this.logErasureAction(userId, 'ERASURE_COMPLETED', report);
    return report;
  }

  /**
   * Get active erasure request for user
   */
  getActiveRequest(userId: string): ErasureRequest | undefined {
    const request = this.requests.get(userId);
    if (!request) return undefined;
    if (['completed', 'rejected', 'expired'].includes(request.status)) return undefined;
    return request;
  }

  /**
   * Check if user has pending erasure request
   */
  hasPendingRequest(userId: string): boolean {
    return this.getActiveRequest(userId) !== undefined;
  }

  /**
   * Reject erasure request
   */
  rejectRequest(userId: string, reason: string): void {
    const request = this.getActiveRequest(userId);
    if (!request) {
      throw new Error('No active erasure request found');
    }
    request.status = 'rejected';
    request.notes = reason;
    this.logErasureAction(userId, 'REQUEST_REJECTED', { reason });
  }

  /**
   * Expire old requests (30 days)
   */
  expireOldRequests(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.requests.forEach((request, userId) => {
      if (request.requestedAt.getTime() < thirtyDaysAgo && request.status === 'pending') {
        request.status = 'expired';
        this.logErasureAction(userId, 'REQUEST_EXPIRED', {});
      }
    });
  }

  private async eraseDataCategory(userId: string, category: DataCategory): Promise<void> {
    // Implementation would delete actual data
    this.logErasureAction(userId, 'DATA_ERASED', { category });
  }

  private async anonymizeData(userId: string, category: DataCategory): Promise<void> {
    // Implementation would replace PII with anonymized data
    this.logErasureAction(userId, 'DATA_ANONYMIZED', { category });
  }

  private logErasureAction(userId: string, action: string, details: object): void {
    const logs = this.erasureLogs.get(userId) || [];
    logs.push({
      action,
      details,
      timestamp: new Date().toISOString()
    });
    this.erasureLogs.set(userId, logs);
  }

  /**
   * Get audit trail for compliance
   */
  getAuditTrail(userId: string): object[] {
    return this.erasureLogs.get(userId) || [];
  }
}

export const erasureService = new ErasureService();
