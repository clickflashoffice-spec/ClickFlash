
import React, { useState, useEffect } from 'react';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { syncService } from '../../services/syncService.ts';
import { connectivityService } from '../../services/connectivityService.ts';

interface SyncStatusIndicatorProps {
    isOnline: boolean;
}

type RealSyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'unreachable';

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ isOnline }) => {
    const [status, setStatus] = useState<RealSyncStatus>('offline');
    const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('lastSyncTime', null);
    const [pendingCount, setPendingCount] = useState(0);
    const [masterReachable, setMasterReachable] = useState(false);

    useEffect(() => {
        // Subscribe to real sync state changes from syncService
        const unsubscribeSync = syncService.subscribe((state) => {
            if (state.isSyncing) {
                setStatus('syncing');
            } else if (state.lastSyncError && masterReachable) {
                setStatus('error');
            } else if (!isOnline || !masterReachable) {
                setStatus(!isOnline ? 'offline' : 'unreachable');
            } else {
                setStatus('synced');
                setLastSyncTime(new Date().toISOString());
            }
            setPendingCount(state.pendingOrdersCount);
        });

        // Subscribe to proactive connectivity detection
        const unsubscribeConnectivity = connectivityService.subscribe((reachable) => {
            setMasterReachable(reachable);
            if (!reachable && isOnline) {
                setStatus('unreachable');
            } else if (reachable && status === 'unreachable') {
                setStatus('syncing');
            }
        });

        return () => {
            unsubscribeSync();
            unsubscribeConnectivity();
        };
    }, [isOnline, masterReachable, setLastSyncTime]);

    const getStatusInfo = () => {
        switch(status) {
            case 'synced':
                const time = lastSyncTime ? `(at ${new Date(lastSyncTime).toLocaleTimeString()})` : '';
                return { text: `Synced ${time}`, color: 'text-green-500 dark:text-green-400', icon: '✓' };
            case 'syncing':
                return { text: 'Syncing...', color: 'text-blue-500 dark:text-blue-400', icon: '⟳' };
            case 'error':
                return { text: 'Sync Error', color: 'text-orange-500 dark:text-orange-400', icon: '!' };
            case 'unreachable':
                return { text: `Master Unreachable ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`, color: 'text-yellow-500 dark:text-yellow-400', icon: '⚠' };
            case 'offline':
                return { text: `Offline ${pendingCount > 0 ? `(${pendingCount} pending)` : ''}`, color: 'text-red-500 dark:text-red-400', icon: '✗' };
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
