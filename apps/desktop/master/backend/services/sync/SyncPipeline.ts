import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { ResourceMonitor } from '../ResourceMonitor';
import { ResortAnalyticsService } from '../ResortAnalyticsService';
import { AuditService } from '../auditService';

export interface SyncConfig {
  enabled: boolean;
  retentionDays: number;
  price: string;
}

export interface SyncContext {
  logger: Logger;
  dbManager: DatabaseManager;
  resourceMonitor: ResourceMonitor | null;
  resortAnalytics: ResortAnalyticsService | null;
  auditService: AuditService;
  emailService: { setCloudConfig: (url: string, token: string) => void };
  config: SyncConfig;
  
  cloudApiUrl: string;
  cloudGalleryUrl: string;
  deskId: string;
  cloudEmail: string;
  cloudPassword: string;
  token: string | null;
  bandwidthThrottle?: {
    isThrottled: boolean;
    maxUploadRateKbps: number;
    delayBetweenChunksMs: number;
    reason: string;
  };

  setToken(token: string | null): void;
  getHeaders(): Promise<Record<string, string>>;
}

export interface PipelineResult {
  name: string;
  success: boolean;
  error?: string;
  details?: Record<string, any>;
}

export interface SyncPipeline {
  name: string;
  execute(context: SyncContext): Promise<PipelineResult>;
}
