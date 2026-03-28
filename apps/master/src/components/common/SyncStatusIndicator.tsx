

import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage.ts';

interface SyncStatusIndicatorProps {
    isOnline: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ isOnline }) => {
    const [status, setStatus] = useState<'synced' | 'syncing' | 'offline'>('offline');
    const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('lastSyncTime', null);

    useEffect(() => {
        let syncTimeout: number | undefined;
        if (isOnline) {
            setStatus('syncing');
            syncTimeout = window.setTimeout(() => {
                setStatus('synced');
                setLastSyncTime(new Date().toISOString());
            }, 1500);
        } else {
            setStatus('offline');
        }
        return () => clearTimeout(syncTimeout);
    }, [isOnline, setLastSyncTime]);

    // Component returns null - status info not needed

    return null;
};

export default SyncStatusIndicator;