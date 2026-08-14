
import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService.ts';
import { Photographer, DestinationFeatures } from '../types.ts';
import { logger } from '@/utils/logger';

// Default to all enabled if not found (fallback mode)
const DEFAULT_FEATURES: DestinationFeatures = { ai: true, face: true, watermark: true };

export const useDestinationFeatures = (currentUser: Photographer | null) => {
    const [features, setFeatures] = useState<DestinationFeatures>(DEFAULT_FEATURES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeatures = async () => {
            if (!currentUser || !currentUser.destinationId) {
                setLoading(false);
                return;
            }
            try {
                const dests = await apiService.getDestinations();
                const myDest = dests.find(d => d.id === currentUser.destinationId);
                if (myDest && myDest.features) {
                    setFeatures(myDest.features);
                }
            } catch (e) {
                logger.error("Failed to fetch destination features", e);
            } finally {
                setLoading(false);
            }
        };
        fetchFeatures();
    }, [currentUser]);

    return { features, loading };
};
