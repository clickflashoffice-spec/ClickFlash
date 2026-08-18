import { Card } from "@clickflash/ui";
import React, { useState, useEffect, useRef } from 'react';

import { StatusIndicator } from './StatusIndicator';
import type { CloudLinkStatus } from '../../../services/api/diagnosticsService';

interface CoreServicesCardProps {
    appServerStatus: 'connected' | 'disconnected' | 'checking';
    dbEngineStatus: 'connected' | 'disconnected' | 'checking';
    cloudLinkStatus?: CloudLinkStatus;
}

interface ThermalData {
    temp: number | null;
    status: 'normal' | 'warning' | 'critical';
}

export const CoreServicesCard: React.FC<CoreServicesCardProps> = ({ 
    appServerStatus, 
    dbEngineStatus,
    cloudLinkStatus 
}) => {
    const [thermal, setThermal] = useState<ThermalData | null>(null);
    const failureCount = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch thermal status with circuit-breaker: stops after 3 consecutive failures
    useEffect(() => {
        const fetchThermal = async () => {
            if (failureCount.current >= 3) return;
            try {
                const res = await fetch('/api/hardware/thermal');
                if (!res.ok) throw new Error('non-ok');
                const data = await res.json();
                failureCount.current = 0;
                setThermal({ temp: data.temp, status: data.status });
            } catch {
                failureCount.current += 1;
                if (failureCount.current >= 3 && intervalRef.current !== null) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        };

        fetchThermal();
        intervalRef.current = setInterval(fetchThermal, 10000);
        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    const getCloudLinkDisplay = () => {
        if (!cloudLinkStatus || cloudLinkStatus.status === 'not_configured') {
            return { text: 'NOT CONFIGURED', color: 'slate' as const };
        }
        if (cloudLinkStatus.status === 'checking') {
            return { text: 'CHECKING...', color: 'yellow' as const };
        }
        if (cloudLinkStatus.status === 'connected') {
            return { text: `CONNECTED${cloudLinkStatus.latency ? ` (${cloudLinkStatus.latency}ms)` : ''}`, color: 'green' as const };
        }
        return { text: 'DISCONNECTED', color: 'red' as const };
    };

    const getThermalDisplay = () => {
        if (!thermal) return { text: 'N/A', color: 'slate' as const, temp: null };
        const tempText = thermal.temp !== null ? `${Math.round(thermal.temp)}°C` : 'N/A';
        
        if (thermal.status === 'critical') {
            return { text: `${tempText} CRITICAL`, color: 'red' as const, temp: thermal.temp };
        }
        if (thermal.status === 'warning') {
            return { text: `${tempText} WARM`, color: 'yellow' as const, temp: thermal.temp };
        }
        return { text: `${tempText} NORMAL`, color: 'green' as const, temp: thermal.temp };
    };

    const cloudDisplay = getCloudLinkDisplay();
    const thermalDisplay = getThermalDisplay();

    return (
        <Card>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Core Services</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Application</span>
                    <StatusIndicator status={appServerStatus} />
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Database</span>
                    <StatusIndicator status={dbEngineStatus} />
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Cloud Link</span>
                    <span className={`font-mono font-bold text-xs ${
                        cloudDisplay.color === 'green' ? 'text-green-600 dark:text-green-400' :
                        cloudDisplay.color === 'red' ? 'text-red-600 dark:text-red-400' :
                        cloudDisplay.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-slate-400'
                    }`}>
                        {cloudDisplay.text}
                    </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">CPU Thermal</span>
                    <span className={`font-mono font-bold text-xs ${
                        thermalDisplay.color === 'green' ? 'text-green-600 dark:text-green-400' :
                        thermalDisplay.color === 'red' ? 'text-red-600 dark:text-red-400' :
                        thermalDisplay.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-slate-400'
                    }`}>
                        {thermalDisplay.text}
                    </span>
                </div>
            </div>
        </Card>
    );
};
