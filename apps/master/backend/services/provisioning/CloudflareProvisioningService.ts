import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { hashPassword } from '../../utils/passwordUtils';

export const CloudflareConfigSchema = z.object({
  apiToken: z.string().min(1, 'Cloudflare API token is required'),
  accountId: z.string().min(1, 'Cloudflare Account ID is required'),
  zoneId: z.string().min(1, 'Cloudflare Zone ID is required'),
  domain: z.string().min(1, 'Domain is required'),
});

export type CloudflareConfig = z.infer<typeof CloudflareConfigSchema>;

export interface TunnelConfig {
  tunnelId: string;
  tunnelName: string;
  tunnelToken: string;
  ingressRules: IngressRule[];
}

export interface IngressRule {
  hostname: string;
  service: string;
}

export interface CloudflareAppConfig {
  name: string;
  domain: string;
  logoUrl?: string;
  description?: string;
  category?: string;
}

export interface LegacyProvisioningResult {
  success: boolean;
  tunnel?: TunnelConfig;
  dnsRecord?: { name: string; type: string; content: string };
  appId?: string;
  error?: string;
  rollbackActions?: LegacyRollbackAction[];
}

export interface LegacyRollbackAction {
  type: 'delete_tunnel' | 'delete_dns' | 'delete_app' | 'revert_db';
  id: string;
  description: string;
}

export class CloudflareProvisioningService {
  private logger: Logger;
  private apiBase = 'https://api.cloudflare.com/client/v4';

  constructor(_db: DatabaseManager, logger: Logger) {
    this.logger = logger;
  }

  private async cfRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    apiToken?: string
  ): Promise<{ success: boolean; data?: T; errors?: string[] }> {
    const token = apiToken || process.env.CLOUDFLARE_API_TOKEN;
    
    if (!token) {
      return { success: false, errors: ['Cloudflare API token not configured'] };
    }

    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errors = Array.isArray(data.errors) 
          ? data.errors.map((e: { message: string }) => e.message)
          : ['Unknown Cloudflare API error'];
        return { success: false, errors };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('[Cloudflare] API request failed', error as Error);
      return { success: false, errors: [(error as Error).message] };
    }
  }

  async validateCredentials(apiToken: string, accountId: string): Promise<boolean> {
    const result = await this.cfRequest(`/accounts/${accountId}`, {}, apiToken);
    return result.success;
  }

  async createTunnel(config: CloudflareConfig, locationName: string): Promise<{ tunnel?: TunnelConfig; error?: string; rollbackActions?: LegacyRollbackAction[] }> {
    const tunnelName = `ClickFlash ${locationName}`;

    this.logger.info('[Cloudflare] Creating tunnel', { tunnelName, locationName });

    const createResult = await this.cfRequest<{
      id: string;
      name: string;
      tunnel_token: string;
    }>('/accounts/{account_id}/tunnels', {
      method: 'POST',
      body: JSON.stringify({
        name: tunnelName,
        tunnel_type: 'full',
      }),
    }, config.apiToken);

    if (!createResult.success || !createResult.data) {
      return { error: createResult.errors?.join(', ') || 'Failed to create tunnel' };
    }

    const tunnel: TunnelConfig = {
      tunnelId: createResult.data.id,
      tunnelName: createResult.data.name,
      tunnelToken: createResult.data.tunnel_token,
      ingressRules: [
        {
          hostname: `${locationName.toLowerCase().replace(/\s+/g, '-')}.${config.domain}`,
          service: 'http://localhost:8090',
        },
      ],
    };

    this.logger.info('[Cloudflare] Tunnel created', { tunnelId: tunnel.tunnelId });

    return {
      tunnel,
      rollbackActions: [
        {
          type: 'delete_tunnel',
          id: tunnel.tunnelId,
          description: `Delete tunnel ${tunnel.tunnelName}`,
        },
      ],
    };
  }

  async configureDNS(config: CloudflareConfig, tunnel: TunnelConfig, locationName: string): Promise<{
    dnsRecord?: { name: string; type: string; content: string };
    error?: string;
    rollbackActions?: LegacyRollbackAction[];
  }> {
    const recordName = `${locationName.toLowerCase().replace(/\s+/g, '-')}.${config.domain}`;
    const tunnelHostname = `${recordName}`;

    this.logger.info('[Cloudflare] Configuring DNS', { recordName, tunnelHostname });

    const createResult = await this.cfRequest<{ id: string; name: string; type: string; content: string }>(
      `/zones/${config.zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'CNAME',
          name: recordName,
          content: `${tunnel.tunnelId}.cfargotunnel.com`,
          proxied: true,
          ttl: 1,
        }),
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data) {
      return { error: createResult.errors?.join(', ') || 'Failed to create DNS record' };
    }

    this.logger.info('[Cloudflare] DNS configured', { recordName });

    return {
      dnsRecord: {
        name: createResult.data.name,
        type: createResult.data.type,
        content: createResult.data.content,
      },
      rollbackActions: [
        {
          type: 'delete_dns',
          id: createResult.data.id,
          description: `Delete DNS record ${recordName}`,
        },
      ],
    };
  }

  async registerAccessApp(config: CloudflareConfig, locationName: string): Promise<{
    appId?: string;
    error?: string;
    rollbackActions?: LegacyRollbackAction[];
  }> {
    const appName = `ClickFlash ${locationName}`;
    const appDomain = `${locationName.toLowerCase().replace(/\s+/g, '-')}.${config.domain}`;

    this.logger.info('[Cloudflare] Registering Access App', { appName, appDomain });

    const createResult = await this.cfRequest<{ id: string; name: string }>(
      `/accounts/${config.accountId}/access/apps`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: appName,
          domain: appDomain,
          type: 'ssh',
          session_duration: '24h',
          headers: [
            {
              name: 'CF-Access-Client-Certificate',
              value: '',
              type: ' STANDARD',
            },
          ],
          app_launcher_visible: true,
          allow_authenticated_origins: true,
          auto_redirect_to_identity: true,
          http_only: false,
          skip_rotation: false,
        }),
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data) {
      return { error: createResult.errors?.join(', ') || 'Failed to create Access App' };
    }

    this.logger.info('[Cloudflare] Access App registered', { appId: createResult.data.id });

    return {
      appId: createResult.data.id,
      rollbackActions: [
        {
          type: 'delete_app',
          id: createResult.data.id,
          description: `Delete Access App ${appName}`,
        },
      ],
    };
  }

  async rollback(actions: LegacyRollbackAction[], apiToken: string): Promise<void> {
    this.logger.info('[Cloudflare] Starting rollback', { actionCount: actions.length });

    for (const action of actions.reverse()) {
      try {
        switch (action.type) {
          case 'delete_tunnel':
            await this.cfRequest(
              `/accounts/{account_id}/tunnels/${action.id}`,
              { method: 'DELETE' },
              apiToken
            );
            this.logger.info('[Cloudflare] Rollback: Deleted tunnel', { id: action.id });
            break;

          case 'delete_dns':
            await this.cfRequest(
              `/zones/${process.env.CLOUDFLARE_ZONE_ID}/dns_records/${action.id}`,
              { method: 'DELETE' },
              apiToken
            );
            this.logger.info('[Cloudflare] Rollback: Deleted DNS record', { id: action.id });
            break;

          case 'delete_app':
            await this.cfRequest(
              `/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/access/apps/${action.id}`,
              { method: 'DELETE' },
              apiToken
            );
            this.logger.info('[Cloudflare] Rollback: Deleted Access App', { id: action.id });
            break;
        }
      } catch (error) {
        this.logger.error('[Cloudflare] Rollback action failed', { action, error });
      }
    }
  }

  async startTunnel(tunnelId: string, tunnelToken: string): Promise<boolean> {
    this.logger.info('[Cloudflare] Starting tunnel daemon', { tunnelId });

    try {
      const { spawn } = require('child_process');
      const tunnelProcess = spawn('cloudflared', [
        'tunnel',
        'run',
        '--token',
        tunnelToken,
        '--no-autoupdate',
      ], {
        detached: false,
        stdio: 'pipe',
      });

      tunnelProcess.on('error', (err: Error) => {
        this.logger.error('[Cloudflare] Tunnel process error', err);
      });

      tunnelProcess.on('exit', (code: number) => {
        this.logger.warn('[Cloudflare] Tunnel exited', { code });
      });

      return true;
    } catch (error) {
      this.logger.error('[Cloudflare] Failed to start tunnel', error as Error);
      return false;
    }
  }
}

export class ProvisioningStateMachine {
  private logger: Logger;
  private db: DatabaseManager;
  private cfService: CloudflareProvisioningService;
  private rollbackActions: LegacyRollbackAction[] = [];

  constructor(db: DatabaseManager, logger: Logger) {
    this.db = db;
    this.logger = logger;
    this.cfService = new CloudflareProvisioningService(db, logger);
  }

  async execute(config: {
    locationName: string;
    adminEmail: string;
    adminPassword: string;
    cloudflareConfig?: CloudflareConfig;
    hubUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.rollbackActions = [];

    try {
      await this.step('initializing', async () => {
        await this.initializeDatabase(config);
      });

      if (config.cloudflareConfig) {
        await this.step('cloudflare_tunnel', async () => {
          const result = await this.cfService.createTunnel(
            config.cloudflareConfig!,
            config.locationName
          );
          if (result.error) throw new Error(result.error);
          this.rollbackActions.push(...(result.rollbackActions || []));
          
          await this.db.run(
            `INSERT INTO settings (id, value, updated_at) VALUES ('cloudflare_tunnel', ?, ?)`,
            [JSON.stringify(result.tunnel), new Date().toISOString()]
          );
        });

        await this.step('cloudflare_dns', async () => {
          const tunnelData = this.db.get<{ value: string }>(
            `SELECT value FROM settings WHERE id = 'cloudflare_tunnel'`
          );
          const tunnel = JSON.parse(tunnelData?.value || '{}');
          
          const result = await this.cfService.configureDNS(
            config.cloudflareConfig!,
            tunnel,
            config.locationName
          );
          if (result.error) throw new Error(result.error);
          this.rollbackActions.push(...(result.rollbackActions || []));
        });

        await this.step('cloudflare_app', async () => {
          const result = await this.cfService.registerAccessApp(
            config.cloudflareConfig!,
            config.locationName
          );
          if (result.error) throw new Error(result.error);
          this.rollbackActions.push(...(result.rollbackActions || []));
        });
      }

      await this.step('hub_registration', async () => {
        await this.registerWithHub(config);
      });

      await this.step('sync_setup', async () => {
        await this.setupSync();
      });

      await this.step('finalizing', async () => {
        await this.finalize();
      });

      this.logger.info('[Provisioning] Deployment completed successfully');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[Provisioning] Deployment failed, initiating rollback', { error: errorMessage });

      if (config.cloudflareConfig) {
        await this.cfService.rollback(this.rollbackActions, config.cloudflareConfig.apiToken);
      }

      await this.rollbackDatabase();

      return { success: false, error: errorMessage };
    }
  }

  private async step(stepName: string, fn: () => Promise<void>): Promise<void> {
    this.logger.info(`[Provisioning] Step: ${stepName}`);
    await fn();
    this.logger.info(`[Provisioning] Step complete: ${stepName}`);
  }

  private async initializeDatabase(config: {
    locationName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<void> {
    const hashedPassword = await hashPassword(config.adminPassword);
    
    const adminId = randomUUID();
    this.db.run(
      `INSERT INTO users (id, email, password, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, config.adminEmail, hashedPassword, 'Admin', 'Administrator', new Date().toISOString(), new Date().toISOString()]
    );

    this.db.run(
      `INSERT INTO settings (id, value, updated_at) VALUES ('location_name', ?, ?)`,
      [config.locationName, new Date().toISOString()]
    );

    this.db.run(
      `INSERT INTO settings (id, value, updated_at) VALUES ('setup_completed', 'true', ?)`,
      [new Date().toISOString()]
    );

    this.logger.info('[Provisioning] Database initialized', { adminId, locationName: config.locationName });
  }

  private async registerWithHub(config: {
    locationName: string;
    hubUrl?: string;
  }): Promise<void> {
    const hubUrl = config.hubUrl || process.env.CLOUD_API_URL || 'https://hub.clickflash.photo';
    
    const locationData = {
      name: config.locationName,
      endpoint: `https://${config.locationName.toLowerCase().replace(/\s+/g, '-')}.master.clickflash.photo`,
      version: process.env.npm_package_version || '4.2.0',
      capabilities: ['photos', 'orders', 'culling', 'face-recognition'],
    };

    try {
      const response = await fetch(`${hubUrl}/api/nodes/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });

      if (response.ok) {
        const hubData = await response.json();
        this.db.run(
          `INSERT INTO settings (id, value, updated_at) VALUES ('hub_registration', ?, ?)`,
          [JSON.stringify(hubData), new Date().toISOString()]
        );
        this.logger.info('[Provisioning] Registered with Hub', { hubUrl });
      }
    } catch (error) {
      this.logger.warn('[Provisioning] Hub registration failed (non-fatal)', { error });
    }
  }

  private async setupSync(): Promise<void> {
    const apiToken = randomUUID();
    
    this.db.run(
      `INSERT INTO settings (id, value, updated_at) VALUES ('local_api_token', ?, ?)`,
      [apiToken, new Date().toISOString()]
    );

    this.db.run(
      `INSERT INTO settings (id, value, updated_at) VALUES ('sync_enabled', 'true', ?)`,
      [new Date().toISOString()]
    );

    this.logger.info('[Provisioning] Sync configured');
  }

  private async finalize(): Promise<void> {
    this.db.run(
      `INSERT INTO settings (id, value, updated_at) VALUES ('deployment_completed', 'true', ?)`,
      [new Date().toISOString()]
    );

    this.rollbackActions = [];
    this.logger.info('[Provisioning] Finalization complete');
  }

  private async rollbackDatabase(): Promise<void> {
    try {
      this.db.run(`DELETE FROM users WHERE role = 'Admin'`);
      this.db.run(`DELETE FROM settings WHERE id IN ('location_name', 'setup_completed', 'cloudflare_tunnel', 'hub_registration', 'local_api_token', 'sync_enabled', 'deployment_completed')`);
      this.logger.info('[Provisioning] Database rolled back');
    } catch (error) {
      this.logger.error('[Provisioning] Database rollback failed', error as Error);
    }
  }
}
