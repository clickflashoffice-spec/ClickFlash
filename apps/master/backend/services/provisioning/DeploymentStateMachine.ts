import si from 'systeminformation';
import { Logger } from '../../shared/logger';
import DatabaseManager from '../../shared/db';
import { CloudflareAppsProvisioningService, CloudflareAppsConfig, GalleryMetadata, ManagementHubMetadata, RollbackAction } from '../cloudflare';
import { randomUUID } from 'crypto';

export interface ProvisioningContext {
  locationName: string;
  adminEmail: string;
  adminPassword: string;
  provisioningSecret?: string;
  cloudflareConfig?: CloudflareAppsConfig;
  hubUrl?: string;
  webhookUrl?: string;
  githubConfig?: {
    owner: string;
    repo: string;
    branch: string;
  };
}

export interface ProvisioningResult {
  success: boolean;
  locationName: string;
  endpoints?: {
    master: string;
    gallery: string;
    management: string;
    website?: string;
  };
  tunnelId?: string;
  apiToken?: string;
  error?: string;
  rollbackPerformed?: boolean;
}

/** Alias for ProvisioningResult — kept for backward compat with BootstrapService */
export type DeploymentResult = ProvisioningResult;

export interface DeploymentStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  message: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type DeploymentEventCallback = (step: DeploymentStep) => void;

export class DeploymentStateMachine {
  private logger: Logger;
  private db: DatabaseManager;
  private cfService: CloudflareAppsProvisioningService;
  private rollbackActions: RollbackAction[] = [];
  private steps: Map<string, DeploymentStep> = new Map();
  private eventCallback?: DeploymentEventCallback;

  constructor(db: DatabaseManager, logger: Logger, eventCallback?: DeploymentEventCallback) {
    this.db = db;
    this.logger = logger;
    this.cfService = new CloudflareAppsProvisioningService(db, logger);
    this.eventCallback = eventCallback;

    this.initializeSteps();
  }

  private initializeSteps(): void {
    const stepDefinitions = [
      { id: 'initializing', label: 'Initializing Database & Credentials' },
      { id: 'cloudflare_tunnel', label: 'Creating Cloudflare Tunnel' },
      { id: 'cloudflare_dns', label: 'Configuring DNS Records' },
      { id: 'cloudflare_waf', label: 'Hardening Firewall (WAF)' },
      { id: 'cloudflare_gallery', label: 'Registering Gallery App' },
      { id: 'cloudflare_management', label: 'Registering Management Hub' },
      { id: 'cloudflare_workers', label: 'Deploying Workers Script' },
      { id: 'cloudflare_website', label: 'Registering Website App' },
      { id: 'cloudflare_webhooks', label: 'Creating Webhooks & Alerts' },
      { id: 'hub_registration', label: 'Connecting to Management Hub' },
      { id: 'sync_setup', label: 'Configuring Background Sync' },
      { id: 'finalizing', label: 'Finalizing Deployment' },
    ];

    for (const step of stepDefinitions) {
      this.steps.set(step.id, {
        id: step.id,
        label: step.label,
        status: 'pending',
        message: 'Waiting...',
      });
    }
  }

  private updateStep(stepId: string, update: Partial<DeploymentStep>): void {
    const step = this.steps.get(stepId);
    if (step) {
      Object.assign(step, update);
      this.eventCallback?.(step);
    }
  }

  private getSteps(): DeploymentStep[] {
    return Array.from(this.steps.values());
  }

  async execute(context: ProvisioningContext): Promise<ProvisioningResult> {
    this.rollbackActions = [];
    this.initializeSteps();

    this.logger.info('[DeploymentStateMachine] Starting deployment', { locationName: context.locationName });



    try {
      this.updateStep('initializing', { status: 'in_progress', message: 'Creating admin credentials...', startedAt: new Date() });

      await this.initializeDatabase(context);

      this.updateStep('initializing', { status: 'completed', message: 'Database initialized successfully', completedAt: new Date() });

      if (context.cloudflareConfig) {
        this.updateStep('cloudflare_tunnel', { status: 'in_progress', message: 'Creating tunnel...', startedAt: new Date() });

        const tunnelResult = await this.cfService.createTunnel(context.cloudflareConfig, context.locationName);
        
        if (tunnelResult.error || !tunnelResult.tunnel) {
          throw new Error(tunnelResult.error || 'Failed to create tunnel');
        }

        this.rollbackActions.push(...(tunnelResult.rollbackActions || []));

        const tunnelStarted = await this.cfService.startTunnel(tunnelResult.tunnel.tunnelToken);
        
        if (!tunnelStarted) {
          this.logger.warn('[DeploymentStateMachine] Tunnel start returned false, continuing...');
        }

        await this.db.run(
          `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
          ['cloudflare_tunnel', 'cloudflare_tunnel', JSON.stringify(tunnelResult.tunnel), new Date().toISOString()]
        );

        this.updateStep('cloudflare_tunnel', { status: 'completed', message: 'Tunnel created and started', completedAt: new Date() });

        this.updateStep('cloudflare_dns', { status: 'in_progress', message: 'Configuring DNS...', startedAt: new Date() });

        const dnsResult = await this.cfService.configureDNS(
          context.cloudflareConfig,
          context.locationName,
          tunnelResult.tunnel.tunnelId
        );

        if (dnsResult.error || !dnsResult.dnsRecords) {
          throw new Error(dnsResult.error || 'Failed to configure DNS');
        }

        this.rollbackActions.push(...(dnsResult.rollbackActions || []));

        await this.db.run(
          `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
          ['cloudflare_dns', 'cloudflare_dns', JSON.stringify(dnsResult.dnsRecords), new Date().toISOString()]
        );

        this.updateStep('cloudflare_dns', { status: 'completed', message: 'DNS configured', completedAt: new Date() });

        this.updateStep('cloudflare_waf', { status: 'in_progress', message: 'Automating security rules...', startedAt: new Date() });

        const wafResult = await this.cfService.createWAFRules(
          context.cloudflareConfig,
          context.locationName
        );

        if (wafResult.error) {
          this.logger.warn('[DeploymentStateMachine] WAF rule creation failed (non-fatal)', { error: wafResult.error });
        } else {
          this.rollbackActions.push(...(wafResult.rollbackActions || []));
          
          if (wafResult.ruleIds) {
            await this.db.run(
              `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
              ['cloudflare_waf_rules', 'cloudflare_waf_rules', JSON.stringify(wafResult.ruleIds), new Date().toISOString()]
            );
          }
        }

        this.updateStep('cloudflare_waf', { status: 'completed', message: 'Firewall hardened', completedAt: new Date() });

        this.updateStep('cloudflare_gallery', { status: 'in_progress', message: 'Registering Gallery app...', startedAt: new Date() });

        const galleryMetadata: GalleryMetadata = {
          name: `ClickFlash Gallery - ${context.locationName}`,
          tagline: 'Beautiful customer photo galleries',
          description: `Professional photo gallery for ${context.locationName}`,
          category: 'Photography',
          logoUrl: 'https://clickflash.photo/logo.png',
          price: 0,
          currency: 'USD',
          supportedLanguages: ['en', 'es', 'fr', 'de'],
        };

        const galleryResult = await this.cfService.registerGalleryApp(
          context.cloudflareConfig,
          context.locationName,
          galleryMetadata,
          context.githubConfig
        );

        if (galleryResult.error || !galleryResult.app) {
          this.logger.warn('[DeploymentStateMachine] Gallery app registration failed (non-fatal)', { error: galleryResult.error });
        } else {
          this.rollbackActions.push(...(galleryResult.rollbackActions || []));

          await this.db.run(
            `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
            ['cloudflare_gallery_app', 'cloudflare_gallery_app', JSON.stringify(galleryResult.app), new Date().toISOString()]
          );

          this.updateStep('cloudflare_gallery', { status: 'completed', message: 'Gallery app registered', completedAt: new Date() });
        }

        this.updateStep('cloudflare_management', { status: 'in_progress', message: 'Registering Management Hub...', startedAt: new Date() });

        const mgmtMetadata: ManagementHubMetadata = {
          name: `ClickFlash Management - ${context.locationName}`,
          tagline: 'Complete business management dashboard',
          description: `Management dashboard for ${context.locationName}`,
          category: 'Business Management',
          logoUrl: 'https://clickflash.photo/logo.png',
          features: ['Order Management', 'Photo Culling', 'Analytics', 'Customer Management'],
          pricingUrl: 'https://clickflash.photo/pricing',
        };

        const mgmtResult = await this.cfService.registerManagementHubApp(
          context.cloudflareConfig,
          context.locationName,
          mgmtMetadata,
          context.githubConfig
        );

        if (mgmtResult.error || !mgmtResult.app) {
          this.logger.warn('[DeploymentStateMachine] Management app registration failed (non-fatal)', { error: mgmtResult.error });
        } else {
          this.rollbackActions.push(...(mgmtResult.rollbackActions || []));

          await this.db.run(
            `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
            ['cloudflare_management_app', 'cloudflare_management_app', JSON.stringify(mgmtResult.app), new Date().toISOString()]
          );

          this.updateStep('cloudflare_management', { status: 'completed', message: 'Management Hub registered', completedAt: new Date() });
        }

        this.updateStep('cloudflare_workers', { status: 'in_progress', message: 'Deploying Workers script...', startedAt: new Date() });

        const workersResult = await this.cfService.createWorkersScript(
          context.cloudflareConfig,
          context.locationName
        );

        if (workersResult.error) {
          this.logger.warn('[DeploymentStateMachine] Workers script creation failed (non-fatal)', { error: workersResult.error });
        } else {
          this.rollbackActions.push(...(workersResult.rollbackActions || []));
          await this.db.run(
            `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
            ['cloudflare_workers_script', 'cloudflare_workers_script', workersResult.scriptId || '', new Date().toISOString()]
          );
          this.updateStep('cloudflare_workers', { status: 'completed', message: 'Workers script deployed', completedAt: new Date() });
        }

        if (context.webhookUrl) {
          this.updateStep('cloudflare_webhooks', { status: 'in_progress', message: 'Creating webhooks...', startedAt: new Date() });

          await this.cfService.registerWebhook(context.cloudflareConfig, context.locationName, context.webhookUrl);

          this.updateStep('cloudflare_webhooks', { status: 'completed', message: 'Webhooks configured', completedAt: new Date() });
        } else {
          this.updateStep('cloudflare_webhooks', { status: 'completed', message: 'Webhooks skipped', completedAt: new Date() });
        }
      } else {
        for (const stepId of ['cloudflare_tunnel', 'cloudflare_dns', 'cloudflare_waf', 'cloudflare_gallery', 'cloudflare_management', 'cloudflare_workers', 'cloudflare_webhooks']) {
          this.updateStep(stepId, { status: 'completed', message: 'Cloudflare configuration skipped', completedAt: new Date() });
        }
      }

      this.updateStep('hub_registration', { status: 'in_progress', message: 'Connecting to Hub...', startedAt: new Date() });

      const hubResult = await this.registerWithHub(context);

      this.updateStep('hub_registration', { status: 'completed', message: hubResult.success ? 'Connected to Hub' : 'Hub connection skipped', completedAt: new Date() });

      this.updateStep('sync_setup', { status: 'in_progress', message: 'Configuring sync...', startedAt: new Date() });

      const apiToken = randomUUID();

      await this.db.run(
        `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
        ['local_api_token', 'local_api_token', apiToken, new Date().toISOString()]
      );

      await this.db.run(
        `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
        ['sync_enabled', 'sync_enabled', 'true', new Date().toISOString()]
      );

      await this.db.run(
        `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
        ['sync_status', 'sync_status', 'active', new Date().toISOString()]
      );

      this.updateStep('sync_setup', { status: 'completed', message: 'Sync configured', completedAt: new Date() });

      this.updateStep('finalizing', { status: 'in_progress', message: 'Finalizing...', startedAt: new Date() });

      await this.db.run(
        `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
        ['deployment_completed', 'deployment_completed', 'true', new Date().toISOString()]
      );

      await this.db.run(
        `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
        ['deployment_timestamp', 'deployment_timestamp', new Date().toISOString(), new Date().toISOString()]
      );

      this.updateStep('finalizing', { status: 'completed', message: 'Deployment complete!', completedAt: new Date() });

      this.rollbackActions = [];

      this.logger.info('[DeploymentStateMachine] Deployment completed successfully');

      return {
        success: true,
        locationName: context.locationName,
        endpoints: context.cloudflareConfig ? {
          master: `https://master.${context.cloudflareConfig.domain}`,
          gallery: `https://gallery.${context.cloudflareConfig.domain}`,
          management: `https://management.${context.cloudflareConfig.domain}`,
        } : undefined,
        tunnelId: this.db.get<{ value: string }>(`SELECT value FROM settings WHERE id = 'cloudflare_tunnel'`) 
          ? JSON.parse(this.db.get<{ value: string }>(`SELECT value FROM settings WHERE id = 'cloudflare_tunnel'`)?.value || '{}').tunnelId 
          : undefined,
        apiToken,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[DeploymentStateMachine] Deployment failed', { error: errorMessage });

      this.updateStep(this.getCurrentStepId(), { status: 'failed', error: errorMessage, completedAt: new Date() });

      if (context.cloudflareConfig) {
        await this.performRollback(context.cloudflareConfig.apiToken, context);
      } else {
        await this.rollbackDatabase();
      }

      return {
        success: false,
        locationName: context.locationName,
        error: errorMessage,
        rollbackPerformed: this.rollbackActions.length > 0,
      };
    }
  }

  private getCurrentStepId(): string {
    for (const [id, step] of this.steps) {
      if (step.status === 'in_progress') return id;
    }
    return 'finalizing';
  }

  private async initializeDatabase(context: ProvisioningContext): Promise<void> {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(context.adminPassword, 12);

    const adminId = randomUUID();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT OR REPLACE INTO users (id, email, password, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, context.adminEmail, hashedPassword, 'Admin', 'Administrator', now, now]
    );

    this.db.run(
      `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
      ['location_name', 'location_name', context.locationName, now]
    );

    this.db.run(
      `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
      ['location_slug', 'location_slug', context.locationName.toLowerCase().replace(/\s+/g, '-'), now]
    );

    this.db.run(
      `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
      ['setup_completed', 'setup_completed', 'true', now]
    );

    this.logger.info('[DeploymentStateMachine] Database initialized', { adminId, locationName: context.locationName });
  }

  private async registerWithHub(context: ProvisioningContext): Promise<{ success: boolean; error?: string }> {
    const hubUrl = context.hubUrl || process.env.CLOUD_API_URL || 'https://hub.clickflash.photo';

    this.logger.info('[DeploymentStateMachine] Checking Hub health...', { hubUrl });
    
    try {
      const controller = new AbortController();
      const healthTimeout = setTimeout(() => controller.abort(), 5000);

      const healthResponse = await fetch(`${hubUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(healthTimeout);

      if (!healthResponse.ok) {
        this.logger.warn('[DeploymentStateMachine] Hub health check failed', { status: healthResponse.status });
        return { success: false, error: `Hub health check failed with status ${healthResponse.status}` };
      }

      this.logger.info('[DeploymentStateMachine] Hub health check passed');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.warn('[DeploymentStateMachine] Hub health check timed out');
      } else {
        this.logger.warn('[DeploymentStateMachine] Hub health check failed', { error: error.message });
      }
      return { success: false, error: 'Hub is unreachable' };
    }


    this.logger.info('[DeploymentStateMachine] Extracting hardware fingerprint via WMI...');
    let machine_id = 'unknown-hardware';
    try {
      const systemData = await Promise.race([
        si.uuid(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('WMI Timeout')), 2000))
      ]);
      machine_id = systemData.os || systemData.hardware || 'unknown-hardware';
      this.logger.info('[DeploymentStateMachine] Hardware fingerprint extracted successfully');
    } catch (err) {
      this.logger.warn('[DeploymentStateMachine] Hardware fingerprint extraction timed out, using fallback');
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${hubUrl}/api/auth/register-desk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deskId: context.locationName.toLowerCase().replace(/\s+/g, '-'),
          deskName: context.locationName,
          email: context.adminEmail,
          password: context.adminPassword,
          deskLocation: context.locationName,
          provisioningSecret: context.provisioningSecret,
          machine_id,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);

      if (response.ok) {
        const hubData = await response.json();
        const now = new Date().toISOString();
        
        await this.db.run(
          `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
          ['hub_registration', 'hub_registration', JSON.stringify(hubData), now]
        );

        await this.db.run(
          `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
          ['machine_id', 'machine_id', machine_id, now]
        );

        await this.db.run(
          `INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)`,
          ['desk_id', 'desk_id', context.locationName.toLowerCase().replace(/\s+/g, '-'), now]
        );

        this.logger.info('[DeploymentStateMachine] Registered with Hub', { hubUrl });
        return { success: true };
      } else {
        this.logger.warn('[DeploymentStateMachine] Hub registration failed', { status: response.status });
        return { success: false };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logger.warn('[DeploymentStateMachine] Hub registration timed out');
      } else {
        this.logger.warn('[DeploymentStateMachine] Hub registration failed (non-fatal)', { error });
      }
      return { success: false };
    }
  }

  private async performRollback(apiToken: string, context: ProvisioningContext): Promise<void> {
    this.logger.info('[DeploymentStateMachine] Initiating rollback');

    for (const step of this.steps) {
      if (step[1].status === 'completed') {
        this.updateStep(step[0], { status: 'rolled_back' });
      }
    }

    await this.cfService.rollback(this.rollbackActions, apiToken, context.cloudflareConfig);
    await this.rollbackDatabase();

    this.logger.info('[DeploymentStateMachine] Rollback completed');
  }

  private async rollbackDatabase(): Promise<void> {
    try {
      this.db.run(`DELETE FROM users WHERE role = 'Admin'`);
      
      const allSettingsToClean = [
        'location_name', 'location_slug', 'setup_completed', 
        'cloudflare_tunnel', 'cloudflare_dns', 'cloudflare_gallery_app', 
        'cloudflare_management_app', 'hub_registration', 'local_api_token', 
        'sync_enabled', 'sync_status', 'deployment_completed', 'deployment_timestamp',
        'remote_settings_hash', 'hub_settings_hash', 'moneytrash_settings',
        'cloud_email', 'cloud_password', 'cloud_url', 'desk_id', 'cloudflare_waf_rules'
      ];
      
      const placeholders = allSettingsToClean.map(() => '?').join(', ');
      this.db.run(`DELETE FROM settings WHERE id IN (${placeholders})`, allSettingsToClean);
      
      this.logger.info('[DeploymentStateMachine] Database rolled back - cleaned', { 
        settingsRemoved: allSettingsToClean.length 
      });
    } catch (error) {
      this.logger.error('[DeploymentStateMachine] Database rollback failed', { error });
    }
  }

  getDeploymentSteps(): DeploymentStep[] {
    return this.getSteps();
  }
}

export default DeploymentStateMachine;