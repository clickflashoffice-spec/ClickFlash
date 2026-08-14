import { useState, useEffect } from 'react';
import { networkManager } from '../services/networkManager';

export const useNetworkStatus = () => {
    const [status, setStatus] = useState(networkManager.getState());

    useEffect(() => {
        const unsubscribe = networkManager.subscribe((newState) => {
            setStatus(newState);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    return {
        isOnline: status.isOnline,
        quality: status.quality,
        latency: status.latency,
        lastChecked: status.lastChecked,
        checkNow: () => networkManager.checkNetworkQuality()
    };
};
