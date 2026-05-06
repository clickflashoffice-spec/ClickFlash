/**
 * Feature Flags System
 * Simple environment-based feature toggles for the ClickFlash ecosystem
 */

export interface FeatureFlag {
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
}

export interface FeatureFlags {
  // Master Portal
  'master.aiFaceSearch': FeatureFlag;
  'master.cloudSync': FeatureFlag;
  'master.stripePayments': FeatureFlag;
  'master.emailRelay': FeatureFlag;
  
  // Touch Kiosk
  'touch.aiEnhancement': FeatureFlag;
  'touch.faceSearch': FeatureFlag;
  'touch.premiumPhotobook': FeatureFlag;
  
  // Gallery
  'gallery.stripeCheckout': FeatureFlag;
  'gallery.watermarking': FeatureFlag;
  'gallery.highResDownload': FeatureFlag;
  
  // Management
  'management.geminiAI': FeatureFlag;
  'management.emailRelay': FeatureFlag;
  
  // Global
  'global.debugMode': FeatureFlag;
  'global.analytics': FeatureFlag;
}

const DEFAULT_FLAGS: FeatureFlags = {
  'master.aiFaceSearch': { enabled: true, description: 'AI-powered face detection and search' },
  'master.cloudSync': { enabled: true, description: 'Cloud synchronization with Hub' },
  'master.stripePayments': { enabled: true, description: 'Stripe payment processing' },
  'master.emailRelay': { enabled: false, description: 'Email relay through Cloud Hub' },
  
  'touch.aiEnhancement': { enabled: true, description: 'AI photo enhancement options' },
  'touch.faceSearch': { enabled: true, description: 'Face search functionality' },
  'touch.premiumPhotobook': { enabled: false, description: 'Premium photobook upsell' },
  
  'gallery.stripeCheckout': { enabled: true, description: 'Stripe checkout integration' },
  'gallery.watermarking': { enabled: true, description: 'Watermark on previews' },
  'gallery.highResDownload': { enabled: true, description: 'High-resolution download after purchase' },
  
  'management.geminiAI': { enabled: false, description: 'Google Gemini AI assistance' },
  'management.emailRelay': { enabled: true, description: 'Email relay through Hub' },
  
  'global.debugMode': { enabled: false, description: 'Enable verbose logging' },
  'global.analytics': { enabled: true, description: 'Usage analytics tracking' },
};

class FeatureFlagService {
  private flags: Map<keyof FeatureFlags, FeatureFlag>;
  
  constructor() {
    this.flags = new Map(Object.entries(DEFAULT_FLAGS));
  }
  
  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName: keyof FeatureFlags): boolean {
    const flag = this.flags.get(flagName);
    return flag?.enabled ?? false;
  }
  
  /**
   * Get feature flag configuration
   */
  getFlag(flagName: keyof FeatureFlags): FeatureFlag | undefined {
    return this.flags.get(flagName);
  }
  
  /**
   * Get all feature flags
   */
  getAllFlags(): Record<keyof FeatureFlags, FeatureFlag> {
    return Object.fromEntries(this.flags) as Record<keyof FeatureFlags, FeatureFlag>;
  }
  
  /**
   * Enable a feature flag (runtime)
   */
  enable(flagName: keyof FeatureFlags): void {
    const flag = this.flags.get(flagName);
    if (flag) {
      this.flags.set(flagName, { ...flag, enabled: true });
    }
  }
  
  /**
   * Disable a feature flag (runtime)
   */
  disable(flagName: keyof FeatureFlags): void {
    const flag = this.flags.get(flagName);
    if (flag) {
      this.flags.set(flagName, { ...flag, enabled: false });
    }
  }
  
  /**
   * Initialize from environment variables
   * Format: FEATURE_FLAG_NAME=true|false
   */
  initFromEnv(): void {
    for (const [key, flag] of Object.entries(DEFAULT_FLAGS)) {
      const envKey = `FEATURE_${key.toUpperCase().replace(/\./g, '_')}`;
      const envValue = process.env[envKey];
      
      if (envValue !== undefined) {
        this.flags.set(key as keyof FeatureFlags, {
          ...flag,
          enabled: envValue === 'true',
        });
      }
    }
  }
}

export const featureFlags = new FeatureFlagService();

// React hook for feature flags
export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(flagName);
}

// Usage examples:
// 
// // Server-side (Node.js)
// import { featureFlags } from '@/utils/featureFlags';
// featureFlags.initFromEnv();
// if (featureFlags.isEnabled('master.aiFaceSearch')) {
//   // Enable AI face search
// }
//
// // React component
// import { useFeatureFlag } from '@/hooks/useFeatureFlag';
// 
// function MyComponent() {
//   const aiEnabled = useFeatureFlag('master.aiFaceSearch');
//   return aiEnabled ? <AIFeature /> : <StandardFeature />;
// }
//
// // Environment variable override (in .env)
// FEATURE_MASTER_AI_FACE_SEARCH=true
