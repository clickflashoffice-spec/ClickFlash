export interface LicenseKeyData {
  key: string;
  plan: string;
  maxMasters: number;
  expiresAt: string;
  createdAt: string;
}

export type LicensePlan = 'trial' | 'starter' | 'pro' | 'enterprise';
