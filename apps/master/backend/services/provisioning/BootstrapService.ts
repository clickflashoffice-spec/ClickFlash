import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { Logger } from '../../utils/logger';
import DatabaseManager from '../../database/db';
import { DeploymentStateMachine, ProvisioningContext, DeploymentResult } from './DeploymentStateMachine';
import { HardwareService } from '../../services/SystemHardwareService';

const BootstrapConfigSchema = z.object({
    locationName: z.string().min(1, 'locationName is required'),
    adminEmail: z.string().email('adminEmail must be a valid email'),
    adminPassword: z.string().min(8, 'adminPassword must be at least 8 characters'),
    provisioningSecret: z.string().min(1, 'provisioningSecret is required for industrial hardening'),
    cloudflareConfig: z.object({
        apiToken: z.string().min(1, 'Cloudflare API token is required'),
        accountId: z.string().min(1, 'Cloudflare Account ID is required'),
        zoneId: z.string().min(1, 'Cloudflare Zone ID is required'),
        domain: z.string().min(1, 'Domain is required'),
    }).optional(),
    hubUrl: z.string().url().optional(),
    webhookUrl: z.string().url().optional(),
});

type BootstrapConfig = z.infer<typeof BootstrapConfigSchema>;

export class BootstrapService {
    private logger: Logger;
    private db: DatabaseManager;
    private bootstrapPath: string;

    constructor(db: DatabaseManager, logger: Logger) {
        this.db = db;
        this.logger = logger;
        this.bootstrapPath = BootstrapService.resolveBootstrapPath();
    }

    private static resolveBootstrapPath(): string {
        const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'pb_data');
        return path.normalize(path.join(dataDir, 'bootstrap.json'));
    }

    private resolveEnvVariables<T extends Record<string, unknown>>(obj: T): T {
        const result: Record<string, unknown> = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = this.resolveEnvString(value);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this.resolveEnvVariables(value as Record<string, unknown>);
            } else {
                result[key] = value;
            }
        }
        
        return result as T;
    }

    private resolveEnvString(value: string): string {
        const envVarPattern = /\$\{([^}]+)\}/g;
        return value.replace(envVarPattern, (match, envKey) => {
            const envValue = process.env[envKey];
            if (envValue === undefined) {
                this.logger.warn(`[Bootstrap] Environment variable ${envKey} not found, keeping placeholder`);
                return match;
            }
            return envValue;
        });
    }

    private sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
        const sanitized: Record<string, unknown> = {};
        const sensitiveKeys = ['adminPassword', 'apiToken', 'cloudPassword', 'cloudEmail'];
        
        for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.includes(key)) {
                sanitized[key] = '***REDACTED***';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeForLogging(value as Record<string, unknown>);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Executes headless provisioning if bootstrap conditions are met.
     */
    public async runIfRequired(): Promise<void> {
        try {
            const setupStatus = this.db.get<{ value: string }>(
                "SELECT value FROM settings WHERE id = 'setup_completed'"
            );

            if (setupStatus?.value === 'true') {
                this.logger.debug('[Bootstrap] System already initialized, skipping ZTP.');
                return;
            }

            if (!fs.existsSync(this.bootstrapPath)) {
                this.logger.debug('[Bootstrap] No bootstrap.json found', { path: this.bootstrapPath });
                
                const altPaths = [
                    path.join(process.cwd(), 'bootstrap.json'),
                    path.join(process.cwd(), 'data', 'bootstrap.json'),
                ];
                
                for (const altPath of altPaths) {
                    const normalizedAlt = path.normalize(altPath);
                    if (fs.existsSync(normalizedAlt)) {
                        this.bootstrapPath = normalizedAlt;
                        this.logger.info('[Bootstrap] Found bootstrap.json at alternative path', { path: normalizedAlt });
                        break;
                    }
                }
                
                if (!fs.existsSync(this.bootstrapPath)) {
                    this.logger.info('[Bootstrap] No bootstrap.json found. Attempting Industrial Zero-Touch Provisioning (ZTP)...');
                    await this.attemptAutoRegistration();
                    return;
                }
            }

            this.logger.info('[Bootstrap] FOUND bootstrap.json! Initiating Zero-Touch Provisioning (ZTP)...');

            const content = fs.readFileSync(this.bootstrapPath, 'utf8');
            let rawConfig: BootstrapConfig;
            
            try {
                rawConfig = JSON.parse(content);
                this.logger.info('[Bootstrap] rawConfig keys:', { keys: Object.keys(rawConfig as any) });
            } catch (parseError) {
                throw new Error(`Invalid JSON in bootstrap.json: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
            }

            const configWithEnv = this.resolveEnvVariables(rawConfig as unknown as Record<string, unknown>) as unknown as BootstrapConfig;

            this.logger.info('[Bootstrap] Resolved config with env keys:', { keys: Object.keys(configWithEnv as Record<string, unknown>) });
            const validationResult = BootstrapConfigSchema.safeParse(configWithEnv);
            
            if (!validationResult.success) {
                this.logger.error('[Bootstrap] validationResult:', { res: JSON.stringify(validationResult) });
                const errors = (validationResult as any).error?.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Unknown Zod Error';
                throw new Error(`bootstrap.json validation failed: ${errors}`);
            }

            const config: ProvisioningContext = {
                locationName: validationResult.data.locationName,
                adminEmail: validationResult.data.adminEmail,
                adminPassword: validationResult.data.adminPassword,
                provisioningSecret: validationResult.data.provisioningSecret,
                cloudflareConfig: validationResult.data.cloudflareConfig,
                hubUrl: validationResult.data.hubUrl,
                webhookUrl: validationResult.data.webhookUrl,
            };

            this.logger.info('[Bootstrap] Bootstrap config validated', this.sanitizeForLogging(config as unknown as Record<string, unknown>));

            const stateMachine = new DeploymentStateMachine(this.db, this.logger, (step) => {
                this.logger.info(`[Bootstrap] [${step.id.toUpperCase()}] ${step.status}: ${step.message}`);
                if (step.error) this.logger.error(`[Bootstrap] Step ${step.id} error`, { error: step.error });
            });

            const result: DeploymentResult = await stateMachine.execute(config);

            if (result.success) {
                this.logger.info('[Bootstrap] Headless deployment COMPLETED successfully.');
                this.logger.info(`[Bootstrap] Location: ${result.locationName}`);
                if (result.endpoints) {
                    this.logger.info(`[Bootstrap] Master: ${result.endpoints.master}`);
                }
                
                const backupDir = path.dirname(this.bootstrapPath);
                const backupPath = path.join(backupDir, `bootstrap.processed.${Date.now()}.json`);
                
                try {
                    fs.renameSync(this.bootstrapPath, backupPath);
                    this.logger.info(`[Bootstrap] Archived bootstrap.json to: ${path.basename(backupPath)}`);
                } catch (archiveError) {
                    this.logger.warn('[Bootstrap] Failed to archive bootstrap.json', { error: archiveError instanceof Error ? archiveError.message : String(archiveError) });
                    try {
                        fs.writeFileSync(this.bootstrapPath, JSON.stringify({ archived: true, processedAt: new Date().toISOString() }));
                    } catch (writeError) {
                        this.logger.error('[Bootstrap] CRITICAL: Could not archive or mark bootstrap.json');
                    }
                }
            } else {
                this.logger.error('[Bootstrap] Headless deployment FAILED.', { error: result.error });
            }
        } catch (error) {
            this.logger.error('[Bootstrap] runIfRequired failed', { error: error instanceof Error ? error.message : String(error) });
        }
    }

    /**
     * Attempts to register the station with the Hub using hardware-bound identity.
     * Phase 4: Industrial Zero-Touch Provisioning (ZTP).
     */
    private async attemptAutoRegistration(): Promise<void> {
        const hubUrl = process.env.CLOUD_API_URL;
        const provisioningSecret = process.env.PROVISIONING_SECRET;

        // Skip if setup is already complete (Redundant check)
        const setupStatus = this.db.get<{ value: string }>("SELECT value FROM settings WHERE id = 'setup_completed'");
        if (setupStatus?.value === 'true') return;

        if (!hubUrl) {
            this.logger.warn('[Bootstrap] Auto-ZTP aborted: CLOUD_API_URL not configured.');
            return;
        }

        if (process.env.TEST_E2E) {
            this.logger.info('[Bootstrap] Auto-ZTP aborted: TEST_E2E mode detected.');
            return;
        }

        const machineId = await HardwareService.getMachineId();
        this.logger.info('[Bootstrap] Initiating resilient Auto-ZTP handshake', { machineId });

        let attempt = 0;
        const maxAttempts = 5;
        let baseDelay = 5000; // 5 seconds initial delay

        while (attempt < maxAttempts) {
            try {
                attempt++;
                this.logger.info(`[Bootstrap] Handshake attempt ${attempt}/${maxAttempts}...`);

                const response = await fetch(`${hubUrl}/api/auth/register-desk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        machine_id: machineId,
                        provisioningSecret: provisioningSecret,
                        is_auto_ztp: true,
                        metadata: {
                            platform: process.platform,
                            arch: process.arch,
                            timestamp: new Date().toISOString()
                        }
                    }),
                    // 15 second signal timeout
                    signal: AbortSignal.timeout(15000)
                });

                const result = await response.json() as any;

                if (response.ok && result.success) {
                    this.logger.info('[Bootstrap] Auto-ZTP SUCCESSFUL', { 
                        deskId: result.desk?.deskId,
                        message: result.message 
                    });

                    // Persist Hub registration details
                    this.db.run(
                        "INSERT INTO settings (id, value, updated_at) VALUES ('hub_registration', ?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                        [JSON.stringify(result), new Date().toISOString()]
                    );

                    // Pin the token and desk ID
                    await this.db.run("INSERT OR REPLACE INTO settings (id, value) VALUES ('local_api_token', ?)", [result.token]);
                    await this.db.run("INSERT OR REPLACE INTO settings (id, value) VALUES ('hub_desk_id', ?)", [result.desk?.deskId]);

                    // Mark setup as completed
                    this.db.run(
                        "INSERT INTO settings (id, value, updated_at) VALUES ('setup_completed', 'true', ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                        [new Date().toISOString()]
                    );

                    this.logger.info('[Bootstrap] Station officially COMMISSIONED via Hardware ID.');
                    return;
                } else {
                    const errorMsg = result.message || 'Unknown server error';
                    this.logger.warn(`[Bootstrap] Handshake rejected by Hub: ${errorMsg}`);
                    
                    // If it's a 4xx error (except 429), don't bother retrying
                    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                        this.logger.error('[Bootstrap] Permanent rejection from Hub. Manual intervention required.');
                        return;
                    }
                }
            } catch (error) {
                this.logger.warn(`[Bootstrap] Handshake attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
            }

            if (attempt < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                this.logger.info(`[Bootstrap] Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        this.logger.error('[Bootstrap] Auto-ZTP failed after maximum attempts. Moving to idle state.');
    }

    public getBootstrapPath(): string {
        return this.bootstrapPath;
    }

    public static setBootstrapPath(customPath: string): void {
        process.env.BOOTSTRAP_PATH = path.normalize(customPath);
    }
}

export default BootstrapService;
