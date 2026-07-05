import express, { Request, Response, Router } from 'express';
import { DeploymentStateMachine } from '../services/provisioning';
import { Logger } from '../utils/logger';
import DatabaseManager from '../database/db';
import { z } from 'zod';
import { sendValidationError, sendError } from '../utils/errorHandler';
import { checkUrl } from '../middleware/ssrfGuard';
import { strictRateLimiter } from '../middleware/rateLimiter';
import { customRoutesSchemas } from '../utils/validation';

const SetupDeploymentSchema = z.object({
  locationName: z.string().min(3).max(100).regex(/^[a-zA-Z0-9\s\-_]+$/, 'Location name can only contain letters, numbers, spaces, hyphens, and underscores'),
  adminEmail: z.string().email('Invalid email format'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  cloudflareApiToken: z.string().optional(),
  cloudflareAccountId: z.string().optional(),
  cloudflareZoneId: z.string().optional(),
  cloudflareDomain: z.string().optional(),
  hubUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
});

interface SetupContext {
  dbManager: DatabaseManager;
  logger: Logger;
}

export default function setupRoutes(context: SetupContext): Router {
  const router = express.Router();
  const { dbManager, logger } = context;

  router.post('/deploy', strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const validation = SetupDeploymentSchema.safeParse(req.body);
      
      if (!validation.success) {
        const errors = validation.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
        return sendValidationError(res, errors.join('; '));
      }

      const { 
        locationName, 
        adminEmail, 
        adminPassword,
        cloudflareApiToken,
        cloudflareAccountId,
        cloudflareZoneId,
        cloudflareDomain,
        hubUrl,
        webhookUrl,
      } = validation.data;

      const cloudflareConfig = cloudflareApiToken && cloudflareAccountId && cloudflareZoneId && cloudflareDomain
        ? { apiToken: cloudflareApiToken, accountId: cloudflareAccountId, zoneId: cloudflareZoneId, domain: cloudflareDomain }
        : undefined;

      logger.info('[Setup] Starting deployment', { locationName, hasCloudflare: !!cloudflareConfig });

      const stateMachine = new DeploymentStateMachine(dbManager, logger);
      
      const result = await stateMachine.execute({
        locationName,
        adminEmail,
        adminPassword,
        cloudflareConfig,
        hubUrl,
        webhookUrl,
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Deployment failed',
          rollbackPerformed: result.rollbackPerformed,
        });
      }

      return res.json({
        success: true,
        message: 'Deployment completed successfully',
        locationName: result.locationName,
        endpoints: result.endpoints,
        apiToken: result.apiToken,
      });

    } catch (error) {
      logger.error('[Setup] Deployment error', { error: error instanceof Error ? error.message : String(error) });
      return sendError(res, 500, 'Deployment failed', error instanceof Error ? error.message : String(error));
    }
  });

  router.get('/status', (_req: Request, res: Response) => {
    try {
      const checkSetting = (id: string) => {
        const row = dbManager.get<{ value: string }>(`SELECT value FROM settings WHERE id = ?`, [id]);
        return row?.value || null;
      };

      const configured = checkSetting('setup_completed') === 'true';
      const deployed = checkSetting('deployment_completed') === 'true';
      const locationName = checkSetting('location_name');
      const syncStatus = checkSetting('sync_status');

      const cloudflareTunnel = checkSetting('cloudflare_tunnel');
      const cloudflareGallery = checkSetting('cloudflare_gallery_app');
      const cloudflareManagement = checkSetting('cloudflare_management_app');

      return res.json({
        configured,
        deployed,
        locationName,
        syncStatus: syncStatus || 'inactive',
        cloudflare: {
          tunnel: cloudflareTunnel ? JSON.parse(cloudflareTunnel) : null,
          gallery: cloudflareGallery ? JSON.parse(cloudflareGallery) : null,
          management: cloudflareManagement ? JSON.parse(cloudflareManagement) : null,
        },
      });
    } catch (error) {
      return sendError(res, 500, 'Internal Server Error', 'Failed to get setup status');
    }
  });

  router.get('/progress', async (_req: Request, res: Response) => {
    try {
      const stateMachine = new DeploymentStateMachine(dbManager, logger);
      const steps = stateMachine.getDeploymentSteps();
      return res.json({ steps });
    } catch (error) {
      return sendError(res, 500, 'Internal Server Error', 'Failed to get progress');
    }
  });

  router.post('/rollback', strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.setupRollback.safeParse(req.body);
      
      if (!parsed.success) {
        return sendValidationError(res, 'Cloudflare API token is required for rollback');
      }
      const { locationName } = parsed.data;

      logger.warn('[Setup] Manual rollback requested', { locationName });

      dbManager.run(`DELETE FROM settings WHERE id IN (
        'cloudflare_tunnel', 'cloudflare_dns', 'cloudflare_gallery_app', 
        'cloudflare_management_app', 'deployment_completed', 'deployment_timestamp'
      )`);

      return res.json({ success: true, message: 'Rollback completed' });
    } catch (error) {
      logger.error('[Setup] Rollback error', { error: error instanceof Error ? error.message : String(error) });
      return sendError(res, 500, 'Internal Server Error', 'Rollback failed');
    }
  });

  router.post('/validate-cloudflare', strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.setupValidateCloudflare.safeParse(req.body);

      if (!parsed.success) {
        return sendValidationError(res, 'API token and account ID are required');
      }
      const { apiToken, accountId } = parsed.data;

      const { CloudflareAppsProvisioningService } = await import('../services/cloudflare');
      const cfService = new CloudflareAppsProvisioningService(dbManager, logger);
      
      const valid = await cfService.validateCredentials(apiToken, accountId);

      if (valid) {
        return res.json({ success: true, message: 'Cloudflare credentials are valid' });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid Cloudflare credentials' });
      }
    } catch (error) {
      return sendError(res, 500, 'Internal Server Error', 'Validation failed');
    }
  });

  router.get('/endpoints', (_req: Request, res: Response) => {
    try {
      const domain = process.env.CLOUDFLARE_DOMAIN || 'clickflash.photo';
      return res.json({
        master: `https://master.${domain}`,
        gallery: `https://gallery.${domain}`,
        management: `https://management.${domain}`,
        website: `https://${domain}`,
      });
    } catch (error) {
      return sendError(res, 500, 'Internal Server Error', 'Failed to get endpoints');
    }
  });

  router.post('/test-connection', strictRateLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = customRoutesSchemas.setupTestConnection.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(res, 'Invalid URL');
      }
      const { hubUrl } = parsed.data;
      const testUrl = hubUrl || process.env.CLOUD_API_URL || 'https://hub.clickflash.photo';

      // P0-5: SSRF guard — reject URLs that point to private/loopback/link-local
      // addresses. This is a known SSRF vector: an attacker could POST
      // {hubUrl: "http://127.0.0.1:8090/api/admin"} or
      // {hubUrl: "http://169.254.169.254/latest/meta-data/"} to coerce the
      // Master server into fetching internal endpoints.
      //
      // The default CLOUD_API_URL is allowlisted; user-supplied hubUrls go
      // through the full check. To allow self-hosted hubs on private IPs,
      // set CLICKFLASH_ALLOW_PRIVATE_HUB=true in the environment.
      const isDefault = !hubUrl && !process.env.CLOUD_API_URL;
      if (!isDefault) {
          const allowPrivate = process.env.CLICKFLASH_ALLOW_PRIVATE_HUB === "true";
          const ssrf = await checkUrl(testUrl, { allowPrivate });
          if (!ssrf.safe) {
              return res.status(400).json({
                  success: false,
                  error: "URL failed SSRF safety check",
                  reason: ssrf.reason,
              });
          }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${testUrl}/api/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          return res.json({ success: true, message: 'Hub connection successful', latency: 'low' });
        } else {
          return res.json({ success: true, message: 'Hub reachable but unhealthy', latency: 'medium' });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return res.status(408).json({ success: false, message: 'Connection timeout' });
        }
        throw fetchError;
      }
    } catch (error) {
      return res.status(503).json({ success: false, message: 'Hub unreachable' });
    }
  });

  return router;
}