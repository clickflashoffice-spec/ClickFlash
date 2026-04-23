

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

    const getStatusInfo = () => {
        switch(status) {
            case 'synced':
                const time = lastSyncTime ? `(at ${new Date(lastSyncTime).toLocaleTimeString()})` : '';
                return { text: `Cloud Synced ${time}`, color: 'text-green-500 dark:text-green-400', icon: '✓' };
            case 'syncing':
                return { text: 'Syncing...', color: 'text-blue-500 dark:text-blue-400', icon: '⟳' };
            case 'offline':
                return { text: 'Offline', color: 'text-red-500 dark:text-red-400', icon: '✗' };
        }
    };

    const { text, color, icon } = getStatusInfo();

    return (
        <div className={`flex items-center space-x-1 text-sm font-semibold ${color}`}>
            <span className={`text-md ${status === 'syncing' ? 'animate-spin' : ''}`}>{icon}</span>
            <span>{text}</span>
        </div>
    );
};

export default SyncStatusIndicator;