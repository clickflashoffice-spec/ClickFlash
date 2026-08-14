import { invoke, isElectron } from './tauriService';

interface CloudConfig {
  apiUrl: string;
  deskId: string;
  apiKey?: string;
}

export interface FinancialAnalytics {
  success?: boolean;
  message?: string;
  summary?: unknown;
  dailyTrend?: unknown;
  [key: string]: unknown;
}

class CloudApiService {
  private config: CloudConfig | null = null;

  configure(config: CloudConfig): void {
    this.config = config;
  }

  async healthCheck(): Promise<{ status: string; version: string }> {
    if (isElectron()) {
      return invoke('cloud_health', { apiUrl: this.config?.apiUrl });
    }
    const response = await fetch(`${this.getApiUrl()}/api/health`);
    if (!response.ok) throw new Error(`Health check failed (${response.status})`);
    return response.json();
  }

  async getFinancials(startDate: string, endDate: string): Promise<FinancialAnalytics> {
    if (isElectron()) {
      return invoke('cloud_financials', { startDate, endDate, apiUrl: this.config?.apiUrl });
    }
    if (!this.config?.apiKey) throw new Error('Legacy desktop credentials are unavailable');
    const query = new URLSearchParams({ startDate, endDate });
    const response = await fetch(`${this.getApiUrl()}/api/analytics/financials?${query}`, {
      headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
    });
    if (!response.ok) throw new Error(`Financial analytics failed (${response.status})`);
    return response.json();
  }

  getApiUrl(): string {
    if (!this.config?.apiUrl) throw new Error('Cloud API is not configured');
    return this.config.apiUrl.replace(/\/$/, '');
  }
}

export const cloudApiService = new CloudApiService();
