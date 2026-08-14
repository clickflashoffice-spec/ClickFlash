/**
 * Use Branding Hook
 * 
 * React hook for accessing and reacting to branding configuration changes.
 */

import { useState, useEffect } from 'react';
import { brandingService, BrandingConfig, ColorScheme } from '../services/brandingService';

export function useBranding() {
    const [branding, setBranding] = useState<BrandingConfig>(brandingService.getBranding());

    useEffect(() => {
        // Subscribe to branding changes
        const unsubscribe = brandingService.subscribe((newBranding) => {
            setBranding(newBranding);
        });

        // Start polling for updates
        brandingService.startPolling(60000); // Check every minute

        return () => {
            unsubscribe();
            brandingService.stopPolling();
        };
    }, []);

    return branding;
}

export function useColors(): ColorScheme {
    const branding = useBranding();
    return branding.colors;
}

export function useLogo(): string {
    const branding = useBranding();
    return branding.assets.logoUrl;
}

export default useBranding;
