/**
 * Cloudflare Email Routing Service
 * 
 * Handles email routing via Cloudflare Workers + Mailchannels
 * Routes: admin@, alerts@, orders@ to configured destinations
 */

import { Logger } from '../../shared/logger';
import { z } from 'zod';

export const EmailRoutingConfigSchema = z.object({
  apiToken: z.string().min(1),
  accountId: z.string().min(1),
  zoneId: z.string().min(1),
  domain: z.string().min(1),
  routes: z.object({
    admin: z.string().email(),
    alerts: z.string().email(),
    orders: z.string().email(),
  }),
});

export type EmailRoutingConfig = z.infer<typeof EmailRoutingConfigSchema>;

export interface EmailRoute {
  id: string;
  name: string;
  email: string;
  target: string;
  verified: boolean;
}

export interface EmailRoutingResult {
  success: boolean;
  routes?: EmailRoute[];
  error?: string;
  rollbackActions?: RollbackAction[];
}

export interface RollbackAction {
  type: 'delete_email_route' | 'delete_worker';
  id: string;
  description: string;
}

export class CloudflareEmailRoutingService {
  private logger: Logger;
  private apiBase = 'https://api.cloudflare.com/client/v4';
  private workerName = 'clickflash-email-router';

  constructor(logger: Logger) {
    this.logger = logger;
  }

  private async cfRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    apiToken?: string
  ): Promise<{ success: boolean; data?: T; errors?: string[]; status?: number }> {
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
          : [data.message || 'Unknown error'];
        return { success: false, errors, status: response.status };
      }

      return { success: true, data };
    } catch (error) {
      this.logger.error('[EmailRouting] API request failed', error as Error);
      return { success: false, errors: [(error as Error).message] };
    }
  }

  async setupEmailRouting(config: EmailRoutingConfig): Promise<EmailRoutingResult> {
    this.logger.info('[EmailRouting] Setting up email routing', { domain: config.domain });

    const routes: EmailRoute[] = [];
    const rollbackActions: RollbackAction[] = [];

    try {
      // Step 1: Create the email routing worker
      const workerResult = await this.createEmailWorker(config);
      if (!workerResult.success) {
        return { success: false, error: workerResult.error };
      }

      rollbackActions.push({
        type: 'delete_worker',
        id: this.workerName,
        description: 'Delete email routing worker',
      });

      // Step 2: Create DNS records for MX and verification
      const mxResult = await this.createMxRecords(config);
      if (!mxResult.success) {
        return { success: false, error: mxResult.error };
      }

      // Step 3: Create email routes
      const routeTypes = [
        { name: 'admin', email: `admin@${config.domain}`, target: config.routes.admin },
        { name: 'alerts', email: `alerts@${config.domain}`, target: config.routes.alerts },
        { name: 'orders', email: `orders@${config.domain}`, target: config.routes.orders },
      ] as const;

      for (const route of routeTypes) {
        const routeResult = await this.createEmailRoute(config, route.email, route.target);
        if (routeResult.success && routeResult.route) {
          routes.push(routeResult.route);
          rollbackActions.push({
            type: 'delete_email_route',
            id: routeResult.route.id,
            description: `Delete email route for ${route.email}`,
          });
        } else {
          this.logger.warn(`[EmailRouting] Failed to create route for ${route.email}`, { error: routeResult.error });
        }
      }

      // Step 4: Verify ownership via DNS
      await this.verifyDomainOwnership(config);

      this.logger.info('[EmailRouting] Email routing setup complete', { routes: routes.length });

      return {
        success: true,
        routes,
        rollbackActions,
      };
    } catch (error) {
      this.logger.error('[EmailRouting] Setup failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        rollbackActions,
      };
    }
  }

  private async createEmailWorker(config: EmailRoutingConfig): Promise<{ success: boolean; error?: string }> {
    this.logger.info('[EmailRouting] Creating email worker');

    const workerScript = `
addEventListener("email", (event) => {
  const to = event.to.toLowerCase();
  const from = event.from.toLowerCase();
  
  // Parse destination from email address
  let destination = null;
  let action = "drop";
  
  if (to.startsWith("admin@")) {
    destination = "${config.routes.admin}";
    action = "forward";
  } else if (to.startsWith("alerts@")) {
    destination = "${config.routes.alerts}";
    action = "forward";
  } else if (to.startsWith("orders@")) {
    destination = "${config.routes.orders}";
    action = "forward";
  } else if (to.startsWith("noreply@") || to.startsWith("support@")) {
    // Allow system emails to pass through
    action = "forward";
    destination = "${config.routes.admin}";
  }
  
  if (action === "forward" && destination) {
    event.forward(destination);
  } else {
    // Drop spam/unrecognized emails
    event.setReject("Mailbox full or recipient not found");
  }
});
`;

    const result = await this.cfRequest(
      `/accounts/${config.accountId}/workers/scripts/${this.workerName}`,
      {
        method: 'PUT',
        body: workerScript,
      },
      config.apiToken
    );

    if (!result.success) {
      return { success: false, error: result.errors?.join(', ') };
    }

    // Enable the worker for email
    const enableResult = await this.cfRequest(
      `/accounts/${config.accountId}/email/routing`,
      {
        method: 'PUT',
        body: JSON.stringify({
          enabled: true,
          routes: [],
        }),
      },
      config.apiToken
    );

    return { success: enableResult.success, error: enableResult.errors?.join(', ') };
  }

  private async createMxRecords(config: EmailRoutingConfig): Promise<{ success: boolean; error?: string }> {
    this.logger.info('[EmailRouting] Creating MX records');

    const mxRecords = [
      {
        name: config.domain,
        type: 'MX',
        content: `${this.workerName}.${config.domain}.`,
        priority: 10,
        proxied: false,
      },
      {
        name: config.domain,
        type: 'MX',
        content: `fallback.${config.domain}.`,
        priority: 20,
        proxied: false,
      },
    ];

    for (const record of mxRecords) {
      const result = await this.cfRequest(
        `/zones/${config.zoneId}/dns_records`,
        {
          method: 'POST',
          body: JSON.stringify(record),
        },
        config.apiToken
      );

      if (!result.success) {
        this.logger.warn(`[EmailRouting] MX record creation failed`, result.errors);
      }
    }

    // Create TXT record for SPF
    await this.cfRequest(
      `/zones/${config.zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: config.domain,
          type: 'TXT',
          content: `v=spf1 include:_spf.${config.domain} ~all`,
          proxied: false,
        }),
      },
      config.apiToken
    );

    // Create DKIM record
    await this.cfRequest(
      `/zones/${config.zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `dkim.${config.domain}`,
          type: 'TXT',
          content: `v=DKIM1; k=rsa; p=PUBLIC_KEY_HERE`,
          proxied: false,
        }),
      },
      config.apiToken
    );

    return { success: true };
  }

  private async createEmailRoute(
    config: EmailRoutingConfig,
    email: string,
    target: string
  ): Promise<{ success: boolean; route?: EmailRoute; error?: string }> {
    this.logger.info('[EmailRouting] Creating route', { email, target });

    const result = await this.cfRequest<{
      id: string;
      tag: string;
      email: string;
      target: string;
      verified: boolean;
    }>(
      `/accounts/${config.accountId}/email/routing/routes`,
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          target,
          action: 'forward',
        }),
      },
      config.apiToken
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.errors?.join(', ') };
    }

    return {
      success: true,
      route: {
        id: result.data.id,
        name: result.data.tag,
        email: result.data.email,
        target: result.data.target,
        verified: result.data.verified,
      },
    };
  }

  private async verifyDomainOwnership(config: EmailRoutingConfig): Promise<boolean> {
    this.logger.info('[EmailRouting] Verifying domain ownership');

    // Create verification TXT record
    const verifyResult = await this.cfRequest(
      `/zones/${config.zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: `_mailcow.${config.domain}`,
          type: 'TXT',
          content: `v=spf1 include:_spf.${config.domain}~all`,
          proxied: false,
        }),
      },
      config.apiToken
    );

    return verifyResult.success;
  }

  async deleteEmailRouting(config: EmailRoutingConfig, rollbackActions: RollbackAction[]): Promise<void> {
    this.logger.info('[EmailRouting] Rolling back email routing');

    for (const action of rollbackActions.reverse()) {
      try {
        if (action.type === 'delete_email_route') {
          await this.cfRequest(
            `/accounts/${config.accountId}/email/routing/routes/${action.id}`,
            { method: 'DELETE' },
            config.apiToken
          );
        } else if (action.type === 'delete_worker') {
          await this.cfRequest(
            `/accounts/${config.accountId}/workers/scripts/${this.workerName}`,
            { method: 'DELETE' },
            config.apiToken
          );
        }
      } catch (error) {
        this.logger.warn(`[EmailRouting] Rollback action failed`, { action: action.description, error });
      }
    }
  }

  async verifyRoutes(config: EmailRoutingConfig): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if worker exists
    const workerResult = await this.cfRequest(
      `/accounts/${config.accountId}/workers/scripts/${this.workerName}`,
      {},
      config.apiToken
    );

    if (!workerResult.success) {
      issues.push('Email routing worker not found');
    }

    // Check DNS records
    const mxResult = await this.cfRequest<{ result: Array<{ name: string; type: string }> }>(
      `/zones/${config.zoneId}/dns_records?type=MX`,
      {},
      config.apiToken
    );

    if (mxResult.success && mxResult.data) {
      const hasMx = mxResult.data.result.some(r => r.name === config.domain);
      if (!hasMx) {
        issues.push('MX record not found');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export default CloudflareEmailRoutingService;
