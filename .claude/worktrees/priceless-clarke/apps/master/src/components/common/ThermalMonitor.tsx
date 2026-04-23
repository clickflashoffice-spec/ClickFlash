
import React, { useState, useEffect } from 'react';
import { Thermometer, AlertTriangle, Cpu, WifiOff } from 'lucide-react';

interface ThermalStatus {
    success: boolean;
    temp: number | null;
    status: 'normal' | 'warning' | 'critical';
    delay: number;
    workerLimit: number;
    timestamp: number;
}

/**
 * Rule 13: Thermal Monitor
 * Displays real-time hardware health and notifies user of throttling.
 */
const ThermalMonitor: React.FC = () => {
    const [status, setStatus] = useState<ThermalStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/hardware/thermal');
                if (!response.ok) throw new Error('Thermal API failed');
                const data: ThermalStatus = await response.json();
                setStatus(data);
                setError(null);
                setRetryCount(0);
            } catch (err) {
                setError('Offline');
                setRetryCount(prev => prev + 1);
                // Stop retrying after 3 failures to reduce console noise
                if (retryCount >= 3) {
                    setStatus({
                        success: false,
                        temp: null,
                        status: 'normal',
                        delay: 0,
                        workerLimit: 4,
                        timestamp: Date.now()
                    });
                }
            }
        };

        const interval = setInterval(fetchStatus, 5000);
        fetchStatus();

        return () => clearInterval(interval);
    }, [retryCount]);

    // Don't show if no status and not explicitly offline
    if (!status && !error) return null;

    // Show offline indicator if API unavailable
    if (error && !status) {
        return (
            <div className="fixed top-20 right-4 z-[9999] flex items-center gap-1.5 px-2 py-1.5 rounded-md border shadow-lg transition-all backdrop-blur-sm bg-slate-900/80 border-slate-700 text-slate-500">
                <WifiOff size={12} />
                <span className="text-[10px] font-bold">Thermal Offline</span>
            </div>
        );
    }

    if (!status) return null;

    const isThrottled = status.status !== 'normal';
    const hasError = !status.success || error;

    return (
        <div className={`fixed top-20 right-4 z-[9999] flex items-center gap-1.5 px-2 py-1.5 rounded-md border shadow-lg transition-all backdrop-blur-sm ${
            status.status === 'critical' ? 'bg-red-500/20 border-red-500 text-red-500' :
            status.status === 'warning' ? 'bg-amber-500/20 border-amber-500 text-amber-500' :
            hasError ? 'bg-slate-800/80 border-slate-600 text-slate-500' :
            'bg-slate-900/80 border-slate-700 text-slate-400'
        }`}>
            {status.status === 'critical' ? (
                <AlertTriangle size={12} className="animate-pulse" />
            ) : status.status === 'warning' ? (
                <Thermometer size={12} className="animate-bounce" />
            ) : hasError ? (
                <WifiOff size={12} />
            ) : (
                <Cpu size={12} />
            )}

            <div className="flex flex-col">
                <span className="text-[10px] font-bold leading-tight">
                    {status.temp !== null ? `${Math.round(status.temp)}°C` : 'N/A'}
                </span>
                {isThrottled && (
                    <span className="text-[8px] uppercase tracking-tighter opacity-90">
                        {status.workerLimit} Cores
                    </span>
                )}
            </div>
        </div>
    );
};

export default ThermalMonitor;
