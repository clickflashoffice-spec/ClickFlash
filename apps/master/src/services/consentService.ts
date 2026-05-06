/**
 * Consent Management Service
 * GDPR/CCPA Compliance - Consent tracking and management
 */

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  method: 'explicit' | 'implicit';
  version: string;
}

export type ConsentType = 
  | 'data_processing'
  | 'marketing_email'
  | 'marketing_sms'
  | 'analytics'
  | 'third_party_sharing'
  | 'cookie_essential'
  | 'cookie_analytics'
  | 'cookie_marketing';

export interface ConsentRequirement {
  type: ConsentType;
  required: boolean;
  description: string;
  legalBasis: string;
}

const CONSENT_REQUIREMENTS: ConsentRequirement[] = [
  {
    type: 'data_processing',
    required: true,
    description: 'Processing of your personal data for service delivery',
    legalBasis: 'Contract performance (GDPR Art. 6(1)(b))'
  },
  {
    type: 'marketing_email',
    required: false,
    description: 'Receiving promotional emails about our services',
    legalBasis: 'Consent (GDPR Art. 6(1)(a))'
  },
  {
    type: 'marketing_sms',
    required: false,
    description: 'Receiving SMS messages about our services',
    legalBasis: 'Consent (GDPR Art. 6(1)(a))'
  },
  {
    type: 'analytics',
    required: false,
    description: 'Usage analytics to improve our services',
    legalBasis: 'Legitimate interest (GDPR Art. 6(1)(f))'
  },
  {
    type: 'third_party_sharing',
    required: false,
    description: 'Sharing data with trusted partners',
    legalBasis: 'Consent (GDPR Art. 6(1)(a))'
  },
  {
    type: 'cookie_essential',
    required: true,
    description: 'Essential cookies for basic functionality',
    legalBasis: 'Contract performance (GDPR Art. 6(1)(b))'
  },
  {
    type: 'cookie_analytics',
    required: false,
    description: 'Analytics cookies to understand usage',
    legalBasis: 'Consent (GDPR Art. 6(1)(a))'
  },
  {
    type: 'cookie_marketing',
    required: false,
    description: 'Marketing cookies for personalized ads',
    legalBasis: 'Consent (GDPR Art. 6(1)(a))'
  }
];

class ConsentService {
  private consents: Map<string, ConsentRecord[]> = new Map();

  /**
   * Get all consent requirements
   */
  getConsentRequirements(): ConsentRequirement[] {
    return CONSENT_REQUIREMENTS;
  }

  /**
   * Check if user has given consent for a specific type
   */
  hasConsent(userId: string, consentType: ConsentType): boolean {
    const records = this.consents.get(userId) || [];
    const latestRecord = records
      .filter(r => r.consentType === consentType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    return latestRecord?.granted ?? false;
  }

  /**
   * Record user consent
   */
  recordConsent(params: {
    userId: string;
    consentType: ConsentType;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
    method?: 'explicit' | 'implicit';
  }): ConsentRecord {
    const record: ConsentRecord = {
      id: crypto.randomUUID(),
      userId: params.userId,
      consentType: params.consentType,
      granted: params.granted,
      timestamp: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      method: params.method || (params.consentType.startsWith('cookie_') ? 'implicit' : 'explicit'),
      version: '1.0'
    };

    const userRecords = this.consents.get(params.userId) || [];
    userRecords.push(record);
    this.consents.set(params.userId, userRecords);

    return record;
  }

  /**
   * Get all consent records for a user
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consents.get(userId) || [];
  }

  /**
   * Check if all required consents are obtained
   */
  hasAllRequiredConsents(userId: string): boolean {
    const required = CONSENT_REQUIREMENTS.filter(r => r.required);
    return required.every(req => this.hasConsent(userId, req.type));
  }

  /**
   * Withdraw consent (GDPR Art. 7(3))
   * Consent can be withdrawn at any time
   */
  withdrawConsent(params: {
    userId: string;
    consentType: ConsentType;
    ipAddress?: string;
    userAgent?: string;
  }): ConsentRecord {
    return this.recordConsent({
      ...params,
      granted: false,
      method: 'explicit'
    });
  }

  /**
   * Export consent records for data portability (GDPR Art. 20)
   */
  exportConsents(userId: string): object {
    const records = this.getUserConsents(userId);
    const requirements = CONSENT_REQUIREMENTS;
    
    return {
      userId,
      exportedAt: new Date().toISOString(),
      consentHistory: records,
      activeConsents: requirements.map(req => ({
        type: req.type,
        description: req.description,
        granted: this.hasConsent(userId, req.type),
        legalBasis: req.legalBasis
      }))
    };
  }

  /**
   * Check consent validity (12 months for explicit consent per GDPR)
   */
  isConsentValid(userId: string, consentType: ConsentType, maxAgeMs: number = 365 * 24 * 60 * 60 * 1000): boolean {
    const records = this.consents.get(userId) || [];
    const validRecords = records
      .filter(r => r.consentType === consentType && r.granted)
      .filter(r => Date.now() - r.timestamp.getTime() < maxAgeMs);
    return validRecords.length > 0;
  }
}

export const consentService = new ConsentService();
