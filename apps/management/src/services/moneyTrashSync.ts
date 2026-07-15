/**
 * Money Trash Settings Sync Service
 * Synchronizes configuration between Management App and Master Portal
 */

import { EventEmitter } from "../utils/EventEmitter";
import { logger } from "@/utils/logger";

interface MoneyTrashConfig {
  enabled: boolean;
  retentionDays: number;
  retentionMinutes?: number; // Legacy field
  discountPercentage: number;
  emailTriggerTime?: number; // Minutes before expiry
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  minOrderValue: number;
  autoDeleteExpired: boolean;
  pricePerPhoto?: number;
  notificationEmail?: string;
  dailyDigestEnabled: boolean;
}

interface SyncSource {
  id: "management" | "master" | "gallery";
  url: string;
  lastSync: Date;
  config: MoneyTrashConfig;
}

class MoneyTrashSyncService extends EventEmitter {
  private sources: Map<string, SyncSource> = new Map();
  private masterConfig: MoneyTrashConfig = this.getDefaultConfig();
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Get default configuration
   */
  private getDefaultConfig(): MoneyTrashConfig {
    return {
      enabled: false,
      retentionDays: 30,
      discountPercentage: 50,
      watermarkEnabled: true,
      watermarkText: "LAST CHANCE",
      watermarkOpacity: 0.5,
      minOrderValue: 5,
      autoDeleteExpired: true,
      dailyDigestEnabled: true,
    };
  }

  /**
   * Register a sync source
   */
  registerSource(source: Omit<SyncSource, "lastSync">): void {
    const fullSource: SyncSource = {
      ...source,
      lastSync: new Date(),
    };

    this.sources.set(source.id, fullSource);
    this.emit("source:registered", fullSource);
  }

  /**
   * Sync configuration from Management App (Supabase)
   */
  async syncFromManagement(
    supabaseUrl: string,
    apiKey: string,
  ): Promise<boolean> {
    try {
      // Fetch from Supabase
      const response = await fetch(
        `${supabaseUrl}/rest/v1/gallery_settings?setting_key=eq.money_trash_config`,
        {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) return false;

      const data = await response.json();
      if (data && data.length > 0) {
        const config: MoneyTrashConfig = {
          ...this.getDefaultConfig(),
          ...JSON.parse(data[0].setting_value),
          // Convert retentionMinutes to days if needed
          retentionDays: data[0].retentionMinutes
            ? Math.ceil(data[0].retentionMinutes / (24 * 60))
            : data[0].retentionDays || 30,
        };

        // Update Master Portal
        await this.pushToMaster(config);

        this.emit("sync:management", config);
        return true;
      }
    } catch (error) {
      logger.error("Failed to sync from Management:", error);
    }
    return false;
  }

  /**
   * Push configuration to Master Portal
   */
  async pushToMaster(config: MoneyTrashConfig): Promise<boolean> {
    try {
      const masterSource = this.sources.get("master");
      if (!masterSource) return false;

      const response = await fetch(`${masterSource.url}/api/network-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moneytrash_enabled: config.enabled,
          moneytrash_retentionDays: config.retentionDays,
          moneytrash_price: config.pricePerPhoto || 4.99,
          moneytrash_watermarkEnabled: config.watermarkEnabled,
          moneytrash_watermarkOpacity: config.watermarkOpacity,
          moneytrash_discountPercentage: config.discountPercentage,
        }),
      });

      if (response.ok) {
        this.masterConfig = config;
        this.emit("config:updated", config);
        return true;
      }
    } catch (error) {
      logger.error("Failed to push to Master:", error);
    }
    return false;
  }

  /**
   * Fetch configuration from Master Portal
   */
  async fetchFromMaster(): Promise<MoneyTrashConfig | null> {
    try {
      const masterSource = this.sources.get("master");
      if (!masterSource) return null;

      const response = await fetch(`${masterSource.url}/api/network-settings`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) return null;

      const data = await response.json();

      const config: MoneyTrashConfig = {
        enabled: data.moneytrash_enabled ?? false,
        retentionDays: data.moneytrash_retentionDays ?? 30,
        discountPercentage: data.moneytrash_discountPercentage ?? 50,
        watermarkEnabled: data.moneytrash_watermarkEnabled ?? true,
        watermarkOpacity: data.moneytrash_watermarkOpacity ?? 0.5,
        pricePerPhoto: data.moneytrash_price ?? 4.99,
        minOrderValue: 5,
        watermarkText: "LAST CHANCE",
        autoDeleteExpired: true,
        dailyDigestEnabled: true,
      };

      this.masterConfig = config;
      this.emit("config:fetched", config);

      return config;
    } catch (error) {
      logger.error("Failed to fetch from Master:", error);
      return null;
    }
  }

  /**
   * Sync configuration to Gallery
   */
  async syncToGallery(galleryUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${galleryUrl}/api/settings/moneytrash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.masterConfig),
      });

      return response.ok;
    } catch (error) {
      logger.error("Failed to sync to Gallery:", error);
      return false;
    }
  }

  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(
      async () => {
        this.emit("sync:start");

        // Try to sync from Management first
        const managementSource = this.sources.get("management");
        if (managementSource) {
          await this.syncFromManagement(managementSource.url, "");
        }

        // Then fetch from Master to confirm
        await this.fetchFromMaster();

        this.emit("sync:complete", this.masterConfig);
      },
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Stop auto sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get current master configuration
   */
  getConfig(): MoneyTrashConfig {
    return { ...this.masterConfig };
  }

  /**
   * Update configuration (single source of truth)
   */
  async updateConfig(updates: Partial<MoneyTrashConfig>): Promise<boolean> {
    const newConfig = { ...this.masterConfig, ...updates };

    // Validate configuration before saving
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) {
      logger.error("[MoneyTrashSync] Validation failed:", validation.errors);
      this.emit("config:validationFailed", validation.errors);
      return false;
    }

    // Sanitize config values
    const sanitizedConfig: MoneyTrashConfig = {
      ...newConfig,
      retentionDays: Math.max(
        1,
        Math.min(365, Math.round(newConfig.retentionDays)),
      ),
      discountPercentage: Math.max(
        0,
        Math.min(100, Math.round(newConfig.discountPercentage)),
      ),
      watermarkOpacity: Math.max(0.1, Math.min(1, newConfig.watermarkOpacity)),
      minOrderValue: Math.max(0, Math.round(newConfig.minOrderValue || 0)),
      pricePerPhoto: newConfig.pricePerPhoto
        ? Math.max(0.01, newConfig.pricePerPhoto)
        : 4.99,
      watermarkText: (newConfig.watermarkText || "LAST CHANCE").slice(0, 20),
    };

    // Push to all sources
    const results = await Promise.all([
      this.pushToMaster(sanitizedConfig),
      this.syncToGallery(this.sources.get("gallery")?.url || ""),
    ]);

    if (results.every((r) => r)) {
      this.masterConfig = sanitizedConfig;
      this.emit("config:changed", sanitizedConfig);
      return true;
    }

    this.emit("config:saveFailed", results);
    return false;
  }

  /**
   * Resolve conflicts between sources
   */
  resolveConflicts(sources: SyncSource[]): MoneyTrashConfig {
    // Priority: Management > Master > Default
    const management = sources.find((s) => s.id === "management");
    if (management) return management.config;

    const master = sources.find((s) => s.id === "master");
    if (master) return master.config;

    return this.getDefaultConfig();
  }

  /**
   * Validate configuration
   */
  validateConfig(config: MoneyTrashConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.retentionDays < 1 || config.retentionDays > 365) {
      errors.push("Retention days must be between 1 and 365");
    }

    if (config.discountPercentage < 0 || config.discountPercentage > 100) {
      errors.push("Discount percentage must be between 0 and 100");
    }

    if (config.watermarkOpacity < 0.1 || config.watermarkOpacity > 1) {
      errors.push("Watermark opacity must be between 0.1 and 1");
    }

    if (!config.watermarkText || config.watermarkText.length < 2) {
      errors.push("Watermark text must be at least 2 characters");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    lastSync: Date | null;
    sourcesConnected: number;
    configValid: boolean;
    errors: string[];
  } {
    const validation = this.validateConfig(this.masterConfig);

    return {
      lastSync: this.sources.get("master")?.lastSync || null,
      sourcesConnected: this.sources.size,
      configValid: validation.valid,
      errors: validation.errors,
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopAutoSync();
    this.removeAllListeners();
  }
}

// Export singleton
export const moneyTrashSync = new MoneyTrashSyncService();
export type { MoneyTrashConfig, SyncSource };
