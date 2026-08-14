
import React from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Activity, CloudOff, Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { cloudSyncService } from '../../services/cloudSyncService';

interface NetworkStatusIndicatorProps {
    compact?: boolean;
}

const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({ compact = false }) => {
    const { isOnline, quality, latency } = useNetworkStatus();
    const [syncStatus, setSyncStatus] = React.useState(cloudSyncService.getStatus());

    React.useEffect(() => {
        const interval = setInterval(() => {
            setSyncStatus(cloudSyncService.getStatus());
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatLastSync = (timestamp: number) => {
        if (!timestamp) return 'Never';
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Just now';
        return `${Math.floor(diff / 60000)}m ago`;
    };

    const getStatusColor = () => {
        if (!isOnline) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
        switch (quality) {
            case 'excellent': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
            case 'good': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'fair': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
            case 'poor': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
            default: return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20';
        }
    };

    const getStatusLabel = () => {
        if (!isOnline) return 'Offline';
        return quality.charAt(0).toUpperCase() + quality.slice(1);
    };

    const getIcon = () => {
        if (!isOnline) return <WifiOff className="w-4 h-4" />;
        // We could potentially pass a syncing prop from SyncService
        // For now, let's just use standard wifi/activity
        if (syncStatus.isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
        if (quality === 'excellent' || quality === 'good') return <Wifi className="w-4 h-4" />;
        if (quality === 'fair' || quality === 'poor') return <Activity className="w-4 h-4" />;
        return <CloudOff className="w-4 h-4" />;
    };

    if (compact) {
        return (
            <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${getStatusColor()}`}
                title={`Network: ${getStatusLabel()} (${latency}ms)`}
            >
                {getIcon()}
                {!isOnline && <span className="hidden sm:inline">Offline</span>}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all border border-transparent ${getStatusColor()}`}>
            <div className="flex items-center justify-center p-1.5 rounded-lg bg-white/50 dark:bg-black/20 shadow-sm">
                {getIcon()}
            </div>
            <div className="flex flex-col">
                <span className="leading-tight flex items-center gap-1.5">
                    {getStatusLabel()}
                    {syncStatus.isSyncing && <RefreshCw className="w-3 h-3 animate-spin opacity-70" />}
                </span>
                <span className="text-[10px] opacity-70 leading-tight">
                    {isOnline ? `${latency}ms • Synced ${formatLastSync(syncStatus.lastSyncTime)}` : 'Cloud Sync Disabled'}
                </span>
            </div>
            {quality === 'poor' && !syncStatus.isSyncing && (
                <AlertTriangle className="w-3.5 h-3.5 ml-auto text-orange-600 animate-pulse" />
            )}
        </div>
    );
};

export default NetworkStatusIndicator;
