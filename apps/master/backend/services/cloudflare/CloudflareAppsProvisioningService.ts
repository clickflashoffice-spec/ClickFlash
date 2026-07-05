import { z } from 'zod';
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';

export const CloudflareAppsConfigSchema = z.object({
  apiToken: z.string().min(1, 'Cloudflare API token is required'),
  accountId: z.string().min(1, 'Cloudflare Account ID is required'),
  zoneId: z.string().min(1, 'Cloudflare Zone ID is required'),
  domain: z.string().min(1, 'Domain is required'),
});

export type CloudflareAppsConfig = z.infer<typeof CloudflareAppsConfigSchema>;

export interface CloudflareApp {
  id: string;
  name: string;
  type: 'gallery' | 'management' | 'website';
  url: string;
  deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed';
}

export interface TunnelConfig {
  tunnelId: string;
  tunnelName: string;
  tunnelToken: string;
  ingressRules: IngressRule[];
}

export interface IngressRule {
  hostname: string;
  service: string;
  originRequest?: Record<string, string>;
}

export interface ProvisioningResult {
  success: boolean;
  tunnel?: TunnelConfig;
  dnsRecords?: DnsRecord[];
  apps?: CloudflareApp[];
  error?: string;
  rollbackActions?: RollbackAction[];
}

export interface DnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  proxied: boolean;
}

export interface RollbackAction {
  type: 'delete_tunnel' | 'delete_dns' | 'delete_workers_script' | 'update_workers_route' | 'delete_waf_rule';
  id: string;
  description: string;
  endpoint?: string;
  data?: unknown;
}

export interface GalleryMetadata {
  name: string;
  tagline: string;
  description: string;
  category: string;
  logoUrl: string;
  screenshots?: string[];
  price?: number;
  currency?: string;
  supportedLanguages?: string[];
}

export interface ManagementHubMetadata {
  name: string;
  tagline: string;
  description: string;
  category: string;
  logoUrl: string;
  features?: string[];
  pricingUrl?: string;
}

export class CloudflareAppsProvisioningService {
  private logger: Logger;
  private apiBase = 'https://api.cloudflare.com/client/v4';

  constructor(_db: DatabaseManager, logger: Logger) {
    this.logger = logger;
  }

  private async cfRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    apiToken?: string
  ): Promise<{ success: boolean; data?: { result: T } & Record<string, any>; errors?: string[]; status?: number }> {
    const token = apiToken || process.env.CLOUDFLARE_API_TOKEN;
    
    if (!token) {
      return { success: false, errors: ['Cloudflare API token not configured'], status: 401 };
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
          : [data.message || 'Unknown Cloudflare API error'];
        return { success: false, errors, status: response.status };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('[Cloudflare Apps] API request failed', error as Error);
      return { success: false, errors: [(error as Error).message] };
    }
  }

  async validateCredentials(apiToken: string, accountId: string): Promise<boolean> {
    const result = await this.cfRequest(`/accounts/${accountId}`, {}, apiToken);
    return result.success;
  }

  async registerGalleryApp(
    config: CloudflareAppsConfig,
    locationName: string,
    _metadata: GalleryMetadata,
    githubConfig?: { owner: string; repo: string; branch: string }
  ): Promise<{ app?: CloudflareApp; error?: string; rollbackActions?: RollbackAction[] }> {
    const appName = `ClickFlash Gallery - ${locationName}`;
    const subdomain = `gallery-${locationName.toLowerCase().replace(/\s+/g, '-')}`;

    this.logger.info('[Cloudflare Apps] Registering Gallery app', { appName, subdomain });

    const sourceConfig = githubConfig
      ? {
          type: 'github' as const,
          config: {
            repo_slug: `${githubConfig.owner}/${githubConfig.repo}`,
            production_branch: githubConfig.branch,
            production_deployments_enabled: true,
          },
        }
      : {
          type: 'direct_upload' as const,
        };

    const createResult = await this.cfRequest<{
      uuid: string;
      name: string;
      subdomain: string;
      source: { type: string };
      deployment_configs: { production: { env_vars: Record<string, { value: string; type: string }> } };
    }>(
      `/accounts/${config.accountId}/pages/projects`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: subdomain,
          subdomain: config.domain,
          build_config: {
            build_command: githubConfig ? 'npm run build' : undefined,
            destination_dir: githubConfig ? 'dist' : undefined,
            root_dist: false,
          },
          source: sourceConfig,
          deployment_configs: {
            production: {
              env_vars: {
                NODE_VERSION: { value: '20', type: 'plain_text' },
                NEXT_TELEMETRY_DISABLED: { value: '1', type: 'plain_text' },
                GALLERY_MODE: { value: 'production', type: 'plain_text' },
                LOCATION_NAME: { value: locationName, type: 'plain_text' },
              },
            },
          },
        }),
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data?.result) {
      return { error: createResult.errors?.join(', ') || 'Failed to create Gallery project' };
    }

    const galleryData = createResult.data.result;
    const galleryApp: CloudflareApp = {
      id: galleryData.uuid,
      name: appName,
      type: 'gallery',
      url: `https://${subdomain}.${config.domain}`,
      deploymentStatus: 'pending',
    };

    this.logger.info('[Cloudflare Apps] Gallery app registered', { 
      appId: galleryApp.id, 
      url: galleryApp.url,
      deploymentMode: githubConfig ? 'github' : 'direct_upload',
    });

    return {
      app: galleryApp,
      rollbackActions: [
        {
          type: 'delete_workers_script',
          id: galleryData.uuid,
          description: `Delete Gallery project ${appName}`,
          endpoint: `/accounts/${config.accountId}/pages/projects/${subdomain}`,
        },
      ],
    };
  }

  async registerManagementHubApp(
    config: CloudflareAppsConfig,
    locationName: string,
    _metadata: ManagementHubMetadata,
    githubConfig?: { owner: string; repo: string; branch: string }
  ): Promise<{ app?: CloudflareApp; error?: string; rollbackActions?: RollbackAction[] }> {
    const appName = `ClickFlash Management - ${locationName}`;
    const subdomain = `management-${locationName.toLowerCase().replace(/\s+/g, '-')}`;

    this.logger.info('[Cloudflare Apps] Registering Management Hub app', { appName, subdomain });

    const sourceConfig = githubConfig
      ? {
          type: 'github' as const,
          config: {
            repo_slug: `${githubConfig.owner}/${githubConfig.repo}`,
            production_branch: githubConfig.branch,
            production_deployments_enabled: true,
          },
        }
      : {
          type: 'direct_upload' as const,
        };

    const createResult = await this.cfRequest<{
      uuid: string;
      name: string;
      subdomain: string;
    }>(
      `/accounts/${config.accountId}/pages/projects`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: subdomain,
          subdomain: config.domain,
          build_config: {
            build_command: githubConfig ? 'npm run build' : undefined,
            destination_dir: githubConfig ? 'dist' : undefined,
            root_dist: false,
          },
          source: sourceConfig,
          deployment_configs: {
            production: {
              env_vars: {
                NODE_VERSION: { value: '20', type: 'plain_text' },
                NEXT_TELEMETRY_DISABLED: { value: '1', type: 'plain_text' },
                MGMT_MODE: { value: 'production', type: 'plain_text' },
                LOCATION_NAME: { value: locationName, type: 'plain_text' },
              },
            },
          },
        }),
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data?.result) {
      return { error: createResult.errors?.join(', ') || 'Failed to create Management Hub project' };
    }

    const mgmtData = createResult.data.result;
    const managementApp: CloudflareApp = {
      id: mgmtData.uuid,
      name: appName,
      type: 'management',
      url: `https://${subdomain}.${config.domain}`,
      deploymentStatus: 'pending',
    };

    this.logger.info('[Cloudflare Apps] Management Hub registered', { appId: managementApp.id, url: managementApp.url });

    return {
      app: managementApp,
      rollbackActions: [
        {
          type: 'delete_workers_script',
          id: mgmtData.uuid,
          description: `Delete Management project ${appName}`,
          endpoint: `/accounts/${config.accountId}/pages/projects/${subdomain}`,
        },
      ],
    };
  }

  async createTunnel(config: CloudflareAppsConfig, locationName: string): Promise<{
    tunnel?: TunnelConfig;
    error?: string;
    rollbackActions?: RollbackAction[]
  }> {
    const tunnelName = `clickflash-master-${locationName.toLowerCase().replace(/\s+/g, '-')}`;
    const tunnelHostname = `master.${config.domain}`;

    this.logger.info('[Cloudflare Apps] Creating Cloudflare Tunnel', { tunnelName });

    const createResult = await this.cfRequest<{
      id: string;
      name: string;
      tunnel_token: string;
    }>(
      `/accounts/${config.accountId}/tunnels`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: tunnelName,
          tunnel_type: 'full',
        }),
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data?.result) {
      return { error: createResult.errors?.join(', ') || 'Failed to create tunnel' };
    }

    const tunnelData = createResult.data.result;
    const tunnel: TunnelConfig = {
      tunnelId: tunnelData.id,
      tunnelName: tunnelData.name,
      tunnelToken: tunnelData.tunnel_token,
      ingressRules: [
        {
          hostname: tunnelHostname,
          service: 'http://localhost:8090',
          originRequest: {
            noTLSVerify: 'true',
          },
        },
        {
          hostname: `*.${config.domain}`,
          service: 'http://localhost:8090',
          originRequest: {
            noTLSVerify: 'true',
          },
        },
      ],
    };

    this.logger.info('[Cloudflare Apps] Tunnel created', { tunnelId: tunnel.tunnelId });

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

  async configureDNS(config: CloudflareAppsConfig, _locationName: string, tunnelId: string): Promise<{
    dnsRecords?: DnsRecord[];
    error?: string;
    rollbackActions?: RollbackAction[]
  }> {
    const masterRecordName = `master.${config.domain}`;
    const galleryRecordName = `gallery.${config.domain}`;
    const managementRecordName = `management.${config.domain}`;

    this.logger.info('[Cloudflare Apps] Configuring DNS records');

    const records = [
      { name: masterRecordName, type: 'CNAME', content: `${tunnelId}.cfargotunnel.com`, proxied: true },
      { name: galleryRecordName, type: 'CNAME', content: `${tunnelId}.cfargotunnel.com`, proxied: true },
      { name: managementRecordName, type: 'CNAME', content: `${tunnelId}.cfargotunnel.com`, proxied: true },
    ];

    const createdRecords: DnsRecord[] = [];
    const rollbackActions: RollbackAction[] = [];

    for (const record of records) {
      const createResult = await this.cfRequest<{ id: string; name: string; type: string; content: string; proxied: boolean }>(
        `/zones/${config.zoneId}/dns_records`,
        {
          method: 'POST',
          body: JSON.stringify(record),
        },
        config.apiToken
      );

      if (!createResult.success || !createResult.data) {
        this.logger.error('[Cloudflare Apps] Failed to create DNS record', { record: record.name, errors: createResult.errors });
        return { error: createResult.errors?.join(', ') || `Failed to create DNS record ${record.name}` };
      }

      const dnsResult = createResult.data?.result || createResult.data;
      createdRecords.push(dnsResult);
      rollbackActions.push({
        type: 'delete_dns',
        id: dnsResult.id,
        description: `Delete DNS record ${record.name}`,
      });

      this.logger.info('[Cloudflare Apps] DNS record created', { name: record.name });
    }

    return { dnsRecords: createdRecords, rollbackActions };
  }

  async createWorkersScript(
    config: CloudflareAppsConfig,
    locationName: string
  ): Promise<{
    scriptId?: string;
    error?: string;
    rollbackActions?: RollbackAction[]
  }> {
    const scriptName = `clickflash-sync-${locationName.toLowerCase().replace(/\s+/g, '-')}`;

    this.logger.info('[Cloudflare Apps] Creating Workers script', { scriptName });

    const workerCode = `
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/sync')) {
    const masterResponse = await fetch('https://master.${config.domain}' + url.pathname + url.search, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    return new Response(masterResponse.body, {
      status: masterResponse.status,
      headers: masterResponse.headers,
    });
  }
  
  return new Response('ClickFlash Sync Worker', { status: 200 });
}
`;

    const createResult = await this.cfRequest<{ id: string }>(
      `/accounts/${config.accountId}/workers/scripts`,
      {
        method: 'POST',
        body: workerCode,
        headers: {
          'Content-Type': 'application/javascript',
        },
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data?.result) {
      return { error: createResult.errors?.join(', ') || 'Failed to create Workers script' };
    }

    const scriptData = createResult.data.result;
    this.logger.info('[Cloudflare Apps] Workers script created', { scriptId: scriptData.id });

    return {
      scriptId: scriptData.id,
      rollbackActions: [
        {
          type: 'delete_workers_script',
          id: scriptData.id,
          description: `Delete Workers script ${scriptName}`,
          endpoint: `/accounts/${config.accountId}/workers/scripts/${scriptName}`,
        },
      ],
    };
  }

  async registerWebhook(
    config: CloudflareAppsConfig,
    locationName: string,
    webhookUrl: string
  ): Promise<{
    webhookId?: string;
    error?: string;
  }> {
    this.logger.info('[Cloudflare Apps] Registering webhook', { webhookUrl });

    const createResult = await this.cfRequest<{ id: string; name: string; url: string; events: string[] }>(
      `/accounts/${config.accountId}/notifications/rules`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `ClickFlash ${locationName} Alerts`,
          url: webhookUrl,
          events: [
            { id: 'alert:synthetic-monitoring-alert', name: 'Health Check Failed' },
            { id: 'alert:dns-alert', name: 'DNS Status Change' },
            { id: 'alert:traffic-routing', name: 'Routing Change' },
          ],
          filters: {
            status: ['healthy', 'failed'],
          },
        }),
      },
      config.apiToken
    );

    if (!createResult.success || !createResult.data?.result) {
      this.logger.warn('[Cloudflare Apps] Webhook registration failed (non-fatal)', { errors: createResult.errors });
      return { error: createResult.errors?.join(', ') };
    }

    const webhookData = createResult.data.result;
    this.logger.info('[Cloudflare Apps] Webhook registered', { webhookId: webhookData.id });

    return { webhookId: webhookData.id };
  }

  async createWAFRules(
    config: CloudflareAppsConfig,
    locationName: string
  ): Promise<{
    ruleIds?: string[];
    error?: string;
    rollbackActions?: RollbackAction[]
  }> {
    this.logger.info('[Cloudflare Apps] Automating WAF Security Rules', { locationName });

    const rules = [
      {
        action: 'block',
        expression: `(http.host eq "master.${config.domain}" and ip.geoip.country ne "US")`,
        description: `Geo-Block non-US traffic for ${locationName}`,
        enabled: true,
      },
      {
        action: 'rate_limit',
        expression: `(http.host eq "master.${config.domain}" and http.request.uri.path contains "/api/")`,
        description: `Rate limit API for ${locationName}`,
        ratelimit: {
          characteristics: ['ip.src'],
          period: 60,
          requests_per_period: 100,
          mitigation_timeout: 600,
        },
        enabled: true,
      }
    ];

    const ruleIds: string[] = [];
    const rollbackActions: RollbackAction[] = [];

    // Cloudflare WAF Rulesets API: /zones/{zone_id}/rulesets/phases/http_request_firewall_custom/rules
    // For simplicity, we'll try to use the modern RuleSets API
    const result = await this.cfRequest<{ id: string }>(
      `/zones/${config.zoneId}/rulesets/phases/http_request_firewall_custom/rules`,
      {
        method: 'POST',
        body: JSON.stringify(rules[0]),
      },
      config.apiToken
    );

    if (result.success && result.data) {
      const ruleData = (result.data as any).result || result.data;
      ruleIds.push(ruleData.id);
      rollbackActions.push({
        type: 'delete_waf_rule',
        id: ruleData.id,
        description: `Delete WAF Geo-Block rule for ${locationName}`,
        endpoint: `/zones/${config.zoneId}/rulesets/phases/http_request_firewall_custom/rules/${ruleData.id}`,
      });
    }

    return { ruleIds, rollbackActions };
  }

  async rollback(actions: RollbackAction[], apiToken: string, config?: { apiToken: string; accountId: string; zoneId: string; domain: string }): Promise<void> {
    this.logger.info('[Cloudflare Apps] Starting rollback', { actionCount: actions.length });

    for (const action of actions.reverse()) {
      try {
        switch (action.type) {
          case 'delete_tunnel':
            const accountId = config?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
            if (accountId) {
              await this.cfRequest(
                `/accounts/${accountId}/tunnels/${action.id}`,
                { method: 'DELETE' },
                apiToken
              );
              this.logger.info('[Cloudflare Apps] Rollback: Deleted tunnel', { id: action.id });
            }
            break;

          case 'delete_dns':
            const zoneId = config?.zoneId || process.env.CLOUDFLARE_ZONE_ID;
            if (zoneId) {
              await this.cfRequest(
                `/zones/${zoneId}/dns_records/${action.id}`,
                { method: 'DELETE' },
                apiToken
              );
              this.logger.info('[Cloudflare Apps] Rollback: Deleted DNS record', { id: action.id });
            }
            break;

          case 'delete_workers_script':
            if (action.endpoint) {
              await this.cfRequest(action.endpoint, { method: 'DELETE' }, apiToken);
              this.logger.info('[Cloudflare Apps] Rollback: Deleted Workers script', { id: action.id });
            }
            break;

          case 'delete_waf_rule':
            if (action.endpoint) {
              await this.cfRequest(action.endpoint, { method: 'DELETE' }, apiToken);
              this.logger.info('[Cloudflare Apps] Rollback: Deleted WAF rule', { id: action.id });
            }
            break;
        }
      } catch (error) {
        this.logger.error('[Cloudflare Apps] Rollback action failed', { action, error });
      }
    }
  }

  async startTunnel(tunnelToken: string): Promise<boolean> {
    this.logger.info('[Cloudflare Apps] Starting Cloudflare Tunnel daemon');

    try {
      const { spawn } = require('child_process');
      
      const tunnelProcess = spawn('cloudflared', [
        'tunnel',
        'run',
        '--token',
        tunnelToken,
        '--no-autoupdate',
        '--metrics',
        'localhost:9090',
      ], {
        detached: true,
        stdio: 'ignore',
      });

      tunnelProcess.on('error', (err: Error) => {
        this.logger.error('[Cloudflare Apps] Tunnel process error', err);
      });

      tunnelProcess.on('exit', (code: number, signal: string) => {
        this.logger.warn('[Cloudflare Apps] Tunnel exited', { code, signal });
      });

      tunnelProcess.unref();

      this.logger.info('[Cloudflare Apps] Tunnel daemon started');
      return true;
    } catch (error) {
      this.logger.error('[Cloudflare Apps] Failed to start tunnel', error as Error);
      return false;
    }
  }

  async deployWorkersScript(
    config: CloudflareAppsConfig,
    scriptName: string,
    scriptContent: string
  ): Promise<{ success: boolean; scriptId?: string; error?: string }> {
    this.logger.info('[Cloudflare Apps] Deploying Workers script via API', { scriptName });

    const uploadResult = await this.cfRequest<{ id: string; etag: string }>(
      `/accounts/${config.accountId}/workers/scripts/${scriptName}/upload`,
      {
        method: 'PUT',
        body: scriptContent,
        headers: {
          'Content-Type': 'application/javascript',
        },
      },
      config.apiToken
    );

    if (!uploadResult.success || !uploadResult.data?.result) {
      return { success: false, error: uploadResult.errors?.join(', ') || 'Failed to upload Workers script' };
    }

    this.logger.info('[Cloudflare Apps] Workers script deployed successfully', { scriptId: uploadResult.data.result.id });
    return { success: true, scriptId: uploadResult.data.result.id };
  }

  async deployPagesProject(
    config: CloudflareAppsConfig,
    projectName: string,
    directoryPath: string
  ): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
    this.logger.info('[Cloudflare Apps] Deploying to Pages project', { projectName, directoryPath });

    const deploymentResult = await this.cfRequest<{ id: string; uid: string }>(
      `/accounts/${config.accountId}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        body: JSON.stringify({
          files: [],
        }),
      },
      config.apiToken
    );

    if (!deploymentResult.success || !deploymentResult.data?.result) {
      return { success: false, error: deploymentResult.errors?.join(', ') || 'Failed to create Pages deployment' };
    }

    this.logger.info('[Cloudflare Apps] Pages deployment initiated', { 
      deploymentId: deploymentResult.data.result.uid,
      projectName 
    });

    return { 
      success: true, 
      deploymentId: deploymentResult.data.result.uid 
    };
  }

  async getWorkersScript(scriptName: string, apiToken?: string): Promise<{ exists: boolean; etag?: string }> {
    const result = await this.cfRequest<{ etag: string }>(
      `/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${scriptName}`,
      { method: 'GET' },
      apiToken
    );
    return { exists: result.success, etag: result.data?.result?.etag };
  }
}