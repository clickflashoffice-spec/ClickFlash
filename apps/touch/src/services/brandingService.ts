/**
 * Branding Service for Touch Kiosk
 * 
 * Handles receiving and applying branding updates pushed from Master Portal.
 * Supports dynamic theming, logo updates, and asset synchronization.
 */

import { logger } from '@/utils/logger';

export interface BrandingAssets {
    logoUrl: string;
    logoDataUrl?: string;
    faviconUrl?: string;
    backgroundImageUrl?: string;
}

export interface ColorScheme {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    error: string;
    success: string;
    warning: string;
}

export interface BrandingConfig {
    version: string;
    lastModified: string;
    kioskId: string;
    colors: ColorScheme;
    fonts: {
        primary: string;
        secondary: string;
    };
    assets: BrandingAssets;
    displayName?: string;
    tagline?: string;
}

const DEFAULT_COLORS: ColorScheme = {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
};

const DEFAULT_BRANDING: BrandingConfig = {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    kioskId: '',
    colors: DEFAULT_COLORS,
    fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Inter, system-ui, sans-serif',
    },
    assets: {
        logoUrl: '/logo.png',
    },
};

class BrandingService {
    private static instance: BrandingService;
    private currentBranding: BrandingConfig = DEFAULT_BRANDING;
    private listeners: Set<(branding: BrandingConfig) => void> = new Set();
    private syncInterval: ReturnType<typeof setInterval> | null = null;

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): BrandingService {
        if (!BrandingService.instance) {
            BrandingService.instance = new BrandingService();
        }
        return BrandingService.instance;
    }

    /**
     * Get current branding configuration
     */
    public getBranding(): BrandingConfig {
        return this.currentBranding;
    }

    /**
     * Get current color scheme
     */
    public getColors(): ColorScheme {
        return this.currentBranding.colors;
    }

    /**
     * Subscribe to branding changes
     */
    public subscribe(callback: (branding: BrandingConfig) => void): () => void {
        this.listeners.add(callback);
        // Immediately call with current branding
        callback(this.currentBranding);
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Apply branding configuration (typically from Master push)
     */
    public async applyBranding(config: Partial<BrandingConfig>): Promise<void> {
        logger.info('[BrandingService] Applying new branding configuration', {
            version: config.version,
        });

        // Deep merge with existing branding
        this.currentBranding = this.deepMerge(this.currentBranding, config);
        this.currentBranding.lastModified = new Date().toISOString();

        // Apply CSS variables to document
        this.applyColorScheme();

        // Load any new assets
        if (config.assets) {
            await this.preloadAssets(config.assets);
        }

        // Persist to localStorage
        this.saveToStorage();

        // Notify listeners
        this.notifyListeners();
    }

    /**
     * Apply color scheme as CSS variables
     */
    private applyColorScheme(): void {
        const root = document.documentElement;
        const colors = this.currentBranding.colors;

        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-background', colors.background);
        root.style.setProperty('--color-surface', colors.surface);
        root.style.setProperty('--color-text', colors.text);
        root.style.setProperty('--color-text-secondary', colors.textSecondary);
        root.style.setProperty('--color-error', colors.error);
        root.style.setProperty('--color-success', colors.success);
        root.style.setProperty('--color-warning', colors.warning);

        // Update meta theme-color for mobile browsers
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', colors.primary);
        }

        logger.debug('[BrandingService] Color scheme applied to CSS variables');
    }

    /**
     * Preload branding assets (logos, backgrounds)
     */
    private async preloadAssets(assets: BrandingAssets): Promise<void> {
        const promises: Promise<void>[] = [];

        if (assets.logoUrl) {
            promises.push(this.preloadImage(assets.logoUrl, 'logo'));
        }
        if (assets.faviconUrl) {
            promises.push(this.preloadImage(assets.faviconUrl, 'favicon'));
        }
        if (assets.backgroundImageUrl) {
            promises.push(this.preloadImage(assets.backgroundImageUrl, 'background'));
        }

        await Promise.allSettled(promises);
    }

    /**
     * Preload a single image
     */
    private preloadImage(url: string, name: string): Promise<void> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                logger.debug(`[BrandingService] ${name} image preloaded`, { url });
                resolve();
            };
            img.onerror = () => {
                logger.warn(`[BrandingService] Failed to preload ${name} image`, { url });
                resolve(); // Don't reject, just warn
            };
            img.src = url;
        });
    }

    /**
     * Load branding from localStorage
     */
    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem('branding_config');
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<BrandingConfig>;
                this.currentBranding = this.deepMerge(DEFAULT_BRANDING, parsed);
                this.applyColorScheme();
                logger.info('[BrandingService] Branding loaded from storage', {
                    version: this.currentBranding.version,
                });
            }
        } catch (error) {
            logger.error('[BrandingService] Failed to load branding from storage', error);
        }
    }

    /**
     * Save branding to localStorage
     */
    private saveToStorage(): void {
        try {
            // Don't persist asset data URLs (too large)
            const toStore = {
                ...this.currentBranding,
                assets: {
                    logoUrl: this.currentBranding.assets.logoUrl,
                    faviconUrl: this.currentBranding.assets.faviconUrl,
                    backgroundImageUrl: this.currentBranding.assets.backgroundImageUrl,
                },
            };
            localStorage.setItem('branding_config', JSON.stringify(toStore));
            logger.debug('[BrandingService] Branding saved to storage');
        } catch (error) {
            logger.error('[BrandingService] Failed to save branding to storage', error);
        }
    }

    /**
     * Notify all listeners of branding changes
     */
    private notifyListeners(): void {
        for (const callback of this.listeners) {
            try {
                callback(this.currentBranding);
            } catch (error) {
                logger.error('[BrandingService] Listener callback failed', error);
            }
        }
    }

    /**
     * Start polling for branding updates from Master
     */
    public startPolling(intervalMs: number = 60000): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.checkForUpdates();
        }, intervalMs);

        logger.info('[BrandingService] Started polling for branding updates', { intervalMs });
    }

    /**
     * Stop polling for updates
     */
    public stopPolling(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            logger.info('[BrandingService] Stopped polling for branding updates');
        }
    }

    /**
     * Check for branding updates from server
     */
    private async checkForUpdates(): Promise<void> {
        try {
            const response = await fetch(`/api/config/branding?v=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (response.ok) {
                const config = await response.json() as Partial<BrandingConfig>;
                
                // Check if this is a newer version
                if (this.isNewerVersion(config.version, this.currentBranding.version)) {
                    logger.info('[BrandingService] New branding version available', {
                        current: this.currentBranding.version,
                        available: config.version,
                    });
                    await this.applyBranding(config);
                }
            }
        } catch (error) {
            // Silently fail on polling errors - branding is non-critical
            logger.debug('[BrandingService] Branding poll failed', error);
        }
    }

    /**
     * Compare semantic versions
     */
    private isNewerVersion(available: string | undefined, current: string): boolean {
        if (!available) return false;
        
        const parse = (v: string) => v.split('.').map(Number);
        const [a1, a2, a3] = parse(available);
        const [c1, c2, c3] = parse(current);
        
        if (a1 !== c1) return a1 > c1;
        if (a2 !== c2) return a2 > c2;
        return a3 > c3;
    }

    /**
     * Deep merge two objects
     */
    private deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
        const result = { ...target };
        
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceValue = source[key];
                const targetValue = target[key];
                
                if (
                    sourceValue !== null &&
                    typeof sourceValue === 'object' &&
                    !Array.isArray(sourceValue) &&
                    targetValue !== null &&
                    typeof targetValue === 'object' &&
                    !Array.isArray(targetValue)
                ) {
                    (result as Record<string, unknown>)[key] = this.deepMerge(
                        targetValue as Record<string, unknown>,
                        sourceValue as Record<string, unknown>
                    );
                } else if (sourceValue !== undefined) {
                    (result as Record<string, unknown>)[key] = sourceValue;
                }
            }
        }
        
        return result;
    }

    /**
     * Reset to default branding
     */
    public resetToDefault(): void {
        this.currentBranding = { ...DEFAULT_BRANDING };
        this.applyColorScheme();
        this.saveToStorage();
        this.notifyListeners();
        logger.info('[BrandingService] Branding reset to defaults');
    }
}

export const brandingService = BrandingService.getInstance();
export default brandingService;
