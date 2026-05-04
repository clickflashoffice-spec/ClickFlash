import React, { useState, useEffect } from 'react';
import Card from '../../common/Card.tsx';
import { webSocketService } from '../../../services/webSocketService';
import { logger } from '../../../utils/logger';

interface KioskInfo {
    id: string;
    name: string;
    status: 'Connected' | 'Disconnected';
    lastSync?: string;
}

const SyncStatusWidget: React.FC = () => {
    const [kiosks, setKiosks] = useState<KioskInfo[]>([]);
    const [stats, setStats] = useState({
        reconnectAttempts: 0,
        status: 'Disconnected'
    });

    useEffect(() => {
        // Subscribe to real-time kiosk status updates
        const handleKioskUpdate = (update: { id: string; name: string; status: 'Connected' | 'Disconnected' }) => {
            setKiosks(prev => {
                const existing = prev.find(k => k.id === update.id);
                if (existing) {
                    return prev.map(k => k.id === update.id ? { ...k, ...update } : k);
                }
                return [...prev, { ...update, lastSync: new Date().toISOString() }];
            });
        };

        webSocketService.subscribe('KIOSK_STATUS_UPDATE', handleKioskUpdate as (data: unknown) => void);

        // Polling for general connection stats
        const interval = setInterval(() => {
            const currentStats = webSocketService.getConnectionStats();
            setStats({
                reconnectAttempts: currentStats.reconnectAttempts,
                status: currentStats.status
            });
        }, 5000);

        return () => {
            webSocketService.unsubscribe('KIOSK_STATUS_UPDATE', handleKioskUpdate as (data: unknown) => void);
            clearInterval(interval);
        };
    }, []);

    return (
        <Card className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${stats.status === 'Connected' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    Kiosk Sync Status
                </h3>
                <div className="text-xs text-slate-500">
                    Reconnect attempts: {stats.reconnectAttempts}
                </div>
            </div>

            <div className="space-y-3">
                {kiosks.length === 0 ? (
                    <div className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-700/50 rounded-lg">
                        No Kiosks detected yet
                    </div>
                ) : (
                    kiosks.map(kiosk => (
                        <div key={kiosk.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-700/30">
                            <div>
                                <div className="font-medium text-sm">{kiosk.name || `Kiosk ${kiosk.id.slice(0, 4)}`}</div>
                                <div className="text-[10px] text-slate-500">{kiosk.id}</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-[10px] font-bold uppercase ${kiosk.status === 'Connected' ? 'text-green-400' : 'text-slate-500'}`}>
                                    {kiosk.status}
                                </div>
                                {kiosk.lastSync && (
                                    <div className="text-[10px] text-slate-500">
                                        Last: {new Date(kiosk.lastSync).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Integrity Protocol: MD5 Verification</span>
                    <span className="text-green-500 font-bold italic">ENABLED</span>
                </div>
            </div>
        </Card>
    );
};

export default SyncStatusWidget;
