import { useState, useEffect, useRef } from 'react';

export interface ThermalStatus {
    success: boolean;
    temp: number | null;
    status: 'normal' | 'warning' | 'critical';
    delay: number;
    workerLimit: number;
    timestamp: number;
}

const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Hook to monitor system thermal status for adaptive performance scaling.
 * Circuit-breaker: stops polling after MAX_CONSECUTIVE_FAILURES consecutive
 * errors so the frontend doesn't hammer an unreachable backend endpoint.
 */
export function useThermalStatus(intervalMs: number = 10000) {
    const [status, setStatus] = useState<ThermalStatus | null>(null);
    const [isThrottled, setIsThrottled] = useState(false);
    const failureCount = useRef(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            // Circuit-breaker: bail out if backend is confirmed unreachable
            if (failureCount.current >= MAX_CONSECUTIVE_FAILURES) return;

            try {
                const response = await fetch('/api/hardware/thermal');
                if (!response.ok) throw new Error('Thermal API failed');
                const data: ThermalStatus = await response.json();
                failureCount.current = 0;
                setStatus(data);
                setIsThrottled(data.status !== 'normal');
            } catch {
                failureCount.current += 1;
                if (failureCount.current >= MAX_CONSECUTIVE_FAILURES) {
                    // Kill the interval — no point hammering an unreachable port
                    if (intervalRef.current !== null) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                }
            }
        };

        failureCount.current = 0;
        fetchStatus();
        intervalRef.current = setInterval(fetchStatus, intervalMs);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [intervalMs]);

    return {
        status: status?.status || 'normal',
        temp: status?.temp || null,
        isThrottled,
        workerLimit: status?.workerLimit || 4
    };
}
