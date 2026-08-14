/**
 * Remote Configuration Service
 * 
 * Provides push-based configuration delivery to Master Portal and Touch Kiosks.
 * Supports pricing, watermarks, branding, and other settings with:
 * - Versioned configurations
 * - Target-specific overrides
 * - Real-time push via WebSocket
 * - Fallback to polling
 */

import { cloudApiService } from './cloudApiService';
import { webSocketService } from './webSocketService';
import { logger } from '@/utils/logger';

export interface WatermarkConfig {
    enabled: boolean;
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
    fontSize: number;
    color: string;
    includeDate: boolean;
    includeEventName: boolean;
}

export interface PricingTier {
    id: string;
    name: string;
    price: number;
    currency: string;
    items: string[];
    description?: string;
}

export interface BrandingConfig {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily?: string;
    tagline?: string;
}

export interface RemoteConfig {
    version: string;
    lastModified: string;
    modifiedBy: string;
    pricing: PricingTier[];
    watermark: WatermarkConfig;
    branding: BrandingConfig;
    features: Record<string, boolean>;
    limits: {
        maxPhotosPerAlbum: number;
        maxAlbumSize: number;
        maxUploadSize: number;
    };
}

export interface ConfigTarget {
    type: 'all' | 'master' | 'touch' | 'station';
    stationId?: string;
}

export interface ConfigPushResult {
    success: boolean;
    deliveredTo: number;
    failedTargets: string[];
    version: string;
}

export interface ConfigSubscription {
    unsubscribe: () => void;
}

const DEFAULT_WATERMARK: WatermarkConfig = {
    enabled: false,
    text: 'ClickFlash',
    position: 'bottom-right',
    opacity: 0.5,
    fontSize: 16,
    color: '#ffffff',
    includeDate: true,
    includeEventName: true,
};

const DEFAULT_BRANDING: BrandingConfig = {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#f59e0b',
};

class RemoteConfigService {
    private static instance: RemoteConfigService;
    private currentConfig: RemoteConfig | null = null;
    private subscriptions: Map<string, (config: RemoteConfig) => void> = new Map();
    private isConnected = false;

    private constructor() {}

    public static getInstance(): RemoteConfigService {
        if (!RemoteConfigService.instance) {
            RemoteConfigService.instance = new RemoteConfigService();
        }
        return RemoteConfigService.instance;
    }

    /**
     * Initialize connection to config service
     */
    public async initialize(): Promise<void> {
        // Fetch initial config
        await this.fetchConfig();

        // Connect to WebSocket for real-time updates
        webSocketService.connect(
            { type: 'master' },
            this.handleConfigUpdate.bind(this),
            (status) => {
                this.isConnected = status === 'Connected';
                logger.info('[RemoteConfig] WebSocket status changed', { isConnected: this.isConnected });
            }
        );
    }

    /**
     * Fetch current configuration from server
     */
    public async fetchConfig(): Promise<RemoteConfig> {
        try {
            const response = await cloudApiService.get('/api/cloud/config/current');
            this.currentConfig = response.data;
            logger.info('[RemoteConfig] Configuration fetched', { version: this.currentConfig?.version });
            return this.currentConfig!;
        } catch (error) {
            logger.error('[RemoteConfig] Failed to fetch config', error);
            // Return default config if fetch fails
            return this.getDefaultConfig();
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): RemoteConfig | null {
        return this.currentConfig;
    }

    /**
     * Subscribe to configuration changes
     */
    public subscribe(id: string, callback: (config: RemoteConfig) => void): ConfigSubscription {
        this.subscriptions.set(id, callback);
        
        // Immediately call with current config if available
        if (this.currentConfig) {
            callback(this.currentConfig);
        }

        return {
            unsubscribe: () => {
                this.subscriptions.delete(id);
            },
        };
    }

    /**
     * Push configuration to specific targets
     */
    public async pushConfig(
        config: Partial<RemoteConfig>,
        target: ConfigTarget,
        message?: string
    ): Promise<ConfigPushResult> {
        try {
            logger.info('[RemoteConfig] Pushing config to targets', { target, message });

            const response = await cloudApiService.post('/api/cloud/config/push', {
                config,
                target,
                message,
            });

            const result = response.data as ConfigPushResult;
            
            logger.info('[RemoteConfig] Config push completed', {
                success: result.success,
                deliveredTo: result.deliveredTo,
            });

            return result;
        } catch (error) {
            logger.error('[RemoteConfig] Failed to push config', error);
            throw error;
        }
    }

    /**
     * Push pricing update to all stations
     */
    public async pushPricing(pricing: PricingTier[]): Promise<ConfigPushResult> {
        return this.pushConfig(
            { pricing },
            { type: 'all' },
            'Pricing update'
        );
    }

    /**
     * Push watermark configuration
     */
    public async pushWatermark(watermark: WatermarkConfig): Promise<ConfigPushResult> {
        return this.pushConfig(
            { watermark },
            { type: 'all' },
            'Watermark settings update'
        );
    }

    /**
     * Push branding configuration
     */
    public async pushBranding(branding: BrandingConfig): Promise<ConfigPushResult> {
        return this.pushConfig(
            { branding },
            { type: 'all' },
            'Branding update'
        );
    }

    /**
     * Push configuration to specific station
     */
    public async pushToStation(
        stationId: string,
        config: Partial<RemoteConfig>
    ): Promise<ConfigPushResult> {
        return this.pushConfig(
            config,
            { type: 'station', stationId },
            `Config update for station ${stationId}`
        );
    }

    /**
     * Get configuration history/versions
     */
    public async getConfigHistory(limit: number = 20): Promise<RemoteConfig[]> {
        try {
            const response = await cloudApiService.get('/api/cloud/config/history', {
                params: { limit },
            });
            return response.data;
        } catch (error) {
            logger.error('[RemoteConfig] Failed to get config history', error);
            return [];
        }
    }

    /**
     * Rollback to previous configuration version
     */
    public async rollbackConfig(version: string): Promise<boolean> {
        try {
            const response = await cloudApiService.post('/api/cloud/config/rollback', {
                version,
            });
            return response.data.success;
        } catch (error) {
            logger.error('[RemoteConfig] Failed to rollback config', error);
            return false;
        }
    }

    /**
     * Validate configuration before pushing
     */
    public validateConfig(config: Partial<RemoteConfig>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (config.pricing) {
            for (const tier of config.pricing) {
                if (tier.price < 0) {
                    errors.push(`Pricing tier "${tier.name}" has negative price`);
                }
                if (!tier.name || tier.name.trim() === '') {
                    errors.push('Pricing tier has empty name');
                }
            }
        }

        if (config.watermark) {
            if (config.watermark.opacity < 0 || config.watermark.opacity > 1) {
                errors.push('Watermark opacity must be between 0 and 1');
            }
            if (config.watermark.fontSize < 8 || config.watermark.fontSize > 72) {
                errors.push('Watermark font size must be between 8 and 72');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Handle incoming config update from WebSocket
     */
    private handleConfigUpdate(data: unknown): void {
        const payload = data as { type: string; config?: RemoteConfig };
        
        if (payload.type === 'CONFIG_UPDATE' && payload.config) {
            logger.info('[RemoteConfig] Received config update via WebSocket', {
                version: payload.config.version,
            });
            
            this.currentConfig = payload.config;
            
            // Notify all subscribers
            for (const callback of this.subscriptions.values()) {
                try {
                    callback(payload.config);
                } catch (err) {
                    logger.error('[RemoteConfig] Subscriber callback failed', err);
                }
            }
        }
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): RemoteConfig {
        return {
            version: '0.0.0',
            lastModified: new Date().toISOString(),
            modifiedBy: 'system',
            pricing: [],
            watermark: DEFAULT_WATERMARK,
            branding: DEFAULT_BRANDING,
            features: {},
            limits: {
                maxPhotosPerAlbum: 1000,
                maxAlbumSize: 10 * 1024 * 1024 * 1024, // 10GB
                maxUploadSize: 100 * 1024 * 1024, // 100MB
            },
        };
    }

    /**
     * Disconnect from config service
     */
    public disconnect(): void {
        webSocketService.disconnect();
        this.subscriptions.clear();
    }
}

export const remoteConfigService = RemoteConfigService.getInstance();
export default remoteConfigService;
