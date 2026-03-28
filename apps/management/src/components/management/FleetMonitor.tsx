import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { Destination } from '../../types';
import {
    Monitor,
    Signal,
    Wifi,
    WifiOff,
    Activity,
    Cpu,
    HardDrive,
    Database,
    AlertTriangle,
    CheckCircle2,
    Clock,
    DollarSign,
    ShoppingCart
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const FleetMonitor: React.FC = () => {
    const [masters, setMasters] = useState<Destination[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFleetStatus = async () => {
        try {
            const data = await apiService.getMastersStatus();
            setMasters(data);
        } catch (error) {
            console.error('Failed to fetch fleet status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFleetStatus();
        const interval = setInterval(fetchFleetStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Signal className="w-5 h-5 text-blue-500" />
                    Fleet Registry
                </h2>
                <div className="text-xs text-slate-500 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {masters.filter(m => m.status === 'Online').length} Online
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        {masters.filter(m => m.status !== 'Online').length} Offline
                    </span>
                    <button onClick={fetchFleetStatus} className="hover:text-blue-500 transition-colors">
                        Refresh Now
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                    ))}
                </div>
            ) : masters.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Monitor className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No Master instances registered in the fleet telemetry.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {masters.map(master => {
                        const isOnline = master.status === 'Online';
                        const metrics = master.healthMetrics || {};

                        return (
                            <div
                                key={master.id}
                                className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border ${isOnline
                                    ? 'border-slate-200 dark:border-slate-700'
                                    : 'border-slate-100 dark:border-slate-800 opacity-75'
                                    } overflow-hidden hover:shadow-md transition-all group`}
                            >
                                {/* Status Header */}
                                <div className={`p-4 flex items-center justify-between ${isOnline ? 'bg-slate-50/50 dark:bg-slate-900/30' : 'bg-slate-50/20'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isOnline ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-400'}`}>
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white leading-tight">
                                                {master.name}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono uppercase">
                                                ID: {master.id?.substring(0, 8)} • v{master.version || '0.0.0'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${isOnline
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>
                                        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                                    </div>
                                </div>

                                {/* Metrics Section */}
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                                <Cpu className="w-3 h-3" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">CPU & Temp</span>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <span className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {(metrics as any).cpu?.load || 0}%
                                                </span>
                                                {(metrics as any).cpu?.temp && (
                                                    <span className={`text-[10px] font-bold ${(metrics as any).cpu.temp > 80 ? 'text-red-500' : 'text-slate-400'}`}>
                                                        {(metrics as any).cpu.temp}°C
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                                <HardDrive className="w-3 h-3" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Storage</span>
                                            </div>
                                            <div className="flex items-end justify-between">
                                                <span className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {(metrics as any).disk?.percent || 0}%
                                                </span>
                                                <span className="text-[10px] text-slate-400 mb-0.5">Used</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Additional Stats */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                                <Activity className="w-3 h-3" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Memory</span>
                                            </div>
                                            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {(metrics as any).memory?.percent || 0}%
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                                <Database className="w-3 h-3" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">Queue</span>
                                            </div>
                                            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {(metrics as any).queueDepth?.photos || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detailed Stats Info */}
                                    <div className="text-[11px] pt-1 space-y-2">
                                        <div className="flex justify-between text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Last Heartbeat
                                            </span>
                                            <span className="font-mono text-slate-700 dark:text-slate-300">
                                                {master.lastSeen ? formatDistanceToNow(new Date(master.lastSeen), { addSuffix: true }) : 'Never'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Signal className="w-3 h-3" />
                                                Uptime
                                            </span>
                                            <span className="font-mono text-slate-700 dark:text-slate-300">
                                                {(metrics as any).uptime ? `${Math.floor((metrics as any).uptime / 3600)}h ${Math.floor(((metrics as any).uptime % 3600) / 60)}m` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
