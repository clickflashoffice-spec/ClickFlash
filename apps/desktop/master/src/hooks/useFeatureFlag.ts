/**
 * useFeatureFlag React Hook
 * Hook to check feature flag status in React components
 */

import { useState, useEffect } from 'react';

// Default flags - in production these would be fetched from a config service
const defaultFlags: Record<string, boolean> = {
  'master.aiFaceSearch': true,
  'master.cloudSync': true,
  'master.stripePayments': true,
  'master.emailRelay': false,
  'touch.aiEnhancement': true,
  'touch.faceSearch': true,
  'touch.premiumPhotobook': false,
  'gallery.stripeCheckout': true,
  'gallery.watermarking': true,
  'gallery.highResDownload': true,
  'management.localIntelligence': true,
  'management.emailRelay': true,
  'global.debugMode': false,
  'global.analytics': true,
};

export function useFeatureFlag(flagName: string): boolean {
  const [enabled, setEnabled] = useState(() => {
    // Check environment variable first (server-side)
    const envKey = `FEATURE_${flagName.toUpperCase().replace(/\./g, '_')}`;
    if (typeof process !== 'undefined' && process.env?.[envKey] !== undefined) {
      return process.env[envKey] === 'true';
    }
    return defaultFlags[flagName] ?? false;
  });

  useEffect(() => {
    // In production, this would fetch from a feature flag service
    // For now, we just use the default or environment variable
    const envKey = `FEATURE_${flagName.toUpperCase().replace(/\./g, '_')}`;
    const envValue = typeof process !== 'undefined' ? process.env?.[envKey] : undefined;
    
    if (envValue !== undefined) {
      setEnabled(envValue === 'true');
    }
  }, [flagName]);

  return enabled;
}

/**
 * useAllFeatureFlags - Get all flags at once
 */
export function useAllFeatureFlags(): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>(defaultFlags);

  useEffect(() => {
    // In production, fetch all flags from service
    setFlags(defaultFlags);
  }, []);

  return flags;
}
