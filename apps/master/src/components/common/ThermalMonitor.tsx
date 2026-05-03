
import React, { useState, useEffect, useRef } from 'react';
import { Thermometer, AlertTriangle, Cpu, WifiOff } from 'lucide-react';

interface ThermalStatus {
    success: boolean;
    temp: number | null;
    status: 'normal' | 'warning' | 'critical';
    delay: number;
    workerLimit: number;
    timestamp: number;
}

const MAX_FAILURES = 3;

/**
 * Rule 13: Thermal Monitor
 * Displays real-time hardware health and notifies user of throttling.
 *
 * Circuit-breaker: uses a ref (not state) to track failures so the useEffect
 * dependency array stays stable ([]). Previously, retryCount was state AND in
 * the dep array — every failure restarted the effect, fired an immediate fetch,
 * and created a runaway ECONNREFUSED flood when the backend wasn't running.
 */
const ThermalMonitor: React.FC = () => {
    const [status, setStatus] = useState<ThermalStatus | null>(null);
    const [offline, setOffline] = useState(false);
    const failureCount = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            // Circuit-breaker: stop fetching once backend is confirmed unreachable
            if (failureCount.current >= MAX_FAILURES) return;

            try {
                const response = await fetch('/api/hardware/thermal');
                if (!response.ok) throw new Error('Thermal API failed');
                const data: ThermalStatus = await response.json();
                failureCount.current = 0;
                setStatus(data);
                setOffline(false);
            } catch {
                failureCount.current += 1;
                if (failureCount.current >= MAX_FAILURES) {
                    setOffline(true);
                    if (intervalRef.current !== null) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                }
            }
        };

        fetchStatus();
        intervalRef.current = setInterval(fetchStatus, 5000);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []); // Stable empty deps — failure tracking is in a ref, not state

    // Don't show if no status and not explicitly offline
    if (!status && !offline) return null;

    // Show offline indicator if API unavailable
    if (offline && !status) {
        return (
            <div className="fixed top-20 right-4 z-[9999] flex items-center gap-1.5 px-2 py-1.5 rounded-md border shadow-lg transition-all backdrop-blur-sm bg-slate-900/80 border-slate-700 text-slate-500">
                <WifiOff size={12} />
                <span className="text-[10px] font-bold">Thermal Offline</span>
            </div>
        );
    }

    if (!status) return null;

    const isThrottled = status.status !== 'normal';
    const hasError = !status.success || offline;

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
