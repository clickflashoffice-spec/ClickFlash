import React from 'react';
import { useConnectionStore } from '../../store/connectionStore';
import { Wifi, WifiOff, Loader2, Circle } from 'lucide-react';

export const RealtimeStatus: React.FC = () => {
    const { status, errorCount } = useConnectionStore();

    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'text-emerald-500';
            case 'reconnecting': return 'text-amber-500';
            case 'disconnected': return 'text-rose-500';
            default: return 'text-slate-400';
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'connected': return 'System Live';
            case 'reconnecting': return 'Reconnecting...';
            case 'disconnected': return 'Bridge Offline';
            default: return 'Link Unknown';
        }
    };

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 transition-all duration-300">
            <div className="relative">
                {status === 'connected' ? (
                    <Wifi className={`w-3.5 h-3.5 ${getStatusColor()}`} />
                ) : status === 'reconnecting' ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin ${getStatusColor()}`} />
                ) : (
                    <WifiOff className={`w-3.5 h-3.5 ${getStatusColor()}`} />
                )}
                {status === 'connected' && (
                    <Circle className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                )}
            </div>
            
            <div className="flex flex-col">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${getStatusColor()}`}>
                    {getStatusLabel()}
                </span>
                {errorCount > 0 && status !== 'connected' && (
                    <span className="text-[8px] text-slate-400 font-mono">
                        Failures: {errorCount}
                    </span>
                )}
            </div>
        </div>
    );
};
