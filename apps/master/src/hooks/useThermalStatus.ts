import { useState, useEffect } from 'react';

export interface ThermalStatus {
    success: boolean;
    temp: number | null;
    status: 'normal' | 'warning' | 'critical';
    delay: number;
    workerLimit: number;
    timestamp: number;
}

/**
 * Hook to monitor system thermal status for adaptive performance scaling.
 */
export function useThermalStatus(intervalMs: number = 10000) {
    const [status, setStatus] = useState<ThermalStatus | null>(null);
    const [isThrottled, setIsThrottled] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/hardware/thermal');
                if (!response.ok) throw new Error('Thermal API failed');
                const data: ThermalStatus = await response.json();
                setStatus(data);
                setIsThrottled(data.status !== 'normal');
            } catch (err) {
                // Silently fail, default to normal
            }
        };

        const interval = setInterval(fetchStatus, intervalMs);
        fetchStatus();

        return () => clearInterval(interval);
    }, [intervalMs]);

    return {
        status: status?.status || 'normal',
        temp: status?.temp || null,
        isThrottled,
        workerLimit: status?.workerLimit || 4
    };
}
