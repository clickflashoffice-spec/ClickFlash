// @ts-nocheck
import { SetupConfig } from '@/components/setup/SetupWizard';
import { logger } from '@/utils/logger';

export interface DeploymentStatus {
  configured: boolean;
  deployed: boolean;
  locationName: string | null;
  syncStatus: 'active' | 'inactive' | 'syncing' | 'error';
  cloudflare: {
    tunnel: {
      tunnelId: string;
      tunnelName: string;
    } | null;
    gallery: { id: string; url: string } | null;
    management: { id: string; url: string } | null;
  };
}

export interface DeploymentResult {
  success: boolean;
  message: string;
  locationName?: string;
  endpoints?: {
    master: string;
    gallery: string;
    management: string;
    website?: string;
  };
  apiToken?: string;
  rollbackPerformed?: boolean;
}

export interface CloudflareValidation {
  success: boolean;
  message: string;
}

export const setupService = {
  async getStatus(): Promise<DeploymentStatus> {
    try {
      const response = await fetch('/api/setup/status');
      if (!response.ok) throw new Error('Failed to get status');
      return response.json();
    } catch (error) {
      logger.error('[SetupService] Failed to get status', error);
      return {
        configured: false,
        deployed: false,
        locationName: null,
        syncStatus: 'inactive',
        cloudflare: { tunnel: null, gallery: null, management: null },
      };
    }
  },

  async deploy(config: SetupConfig): Promise<DeploymentResult> {
    logger.info('[SetupService] Starting deployment', { locationName: config.locationName });
    
    try {
      const response = await fetch('/api/setup/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: config.locationName,
          adminEmail: config.adminEmail,
          adminPassword: config.adminPassword,
          cloudflareApiToken: config.cloudflareApiToken,
          cloudflareAccountId: config.hubUrl,
          cloudflareZoneId: config.hubUrl,
          cloudflareDomain: config.hubUrl,
          hubUrl: config.hubUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        logger.error('[SetupService] Deployment failed', result);
        return {
          success: false,
          message: result.message || 'Deployment failed',
          rollbackPerformed: result.rollbackPerformed,
        };
      }

      logger.info('[SetupService] Deployment successful', result);
      return result;
    } catch (error) {
      logger.error('[SetupService] Deployment error', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async validateCloudflare(apiToken: string, accountId: string): Promise<CloudflareValidation> {
    try {
      const response = await fetch('/api/setup/validate-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken, accountId }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, message: 'Validation request failed' };
    }
  },

  async testHubConnection(hubUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/setup/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubUrl }),
      });
      return response.json();
    } catch {
      return { success: false, message: 'Connection test failed' };
    }
  },

  async getEndpoints(): Promise<{ master: string; gallery: string; management: string; website: string }> {
    try {
      const response = await fetch('/api/setup/endpoints');
      if (!response.ok) throw new Error('Failed to get endpoints');
      return response.json();
    } catch (error) {
      logger.error('[SetupService] Failed to get endpoints', error);
      return {
        master: 'https://master.clickflash.photo',
        gallery: 'https://gallery.clickflash.photo',
        management: 'https://management.clickflash.photo',
        website: 'https://clickflash.photo',
      };
    }
  },

  async performRollback(cloudflareApiToken: string, locationName: string): Promise<{ success: boolean; message: string }> {
    logger.warn('[SetupService] Initiating rollback', { locationName });
    
    try {
      const response = await fetch('/api/setup/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloudflareApiToken, locationName }),
      });
      return response.json();
    } catch (error) {
      logger.error('[SetupService] Rollback failed', error);
      return { success: false, message: 'Rollback request failed' };
    }
  },

  async checkNeedsSetup(): Promise<boolean> {
    const status = await this.getStatus();
    return !status.configured || !status.deployed;
  },
};