import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    latency: number | null; // inms
    status: 'good' | 'poor' | 'offline';
}

const NetworkStatusContext = createContext<NetworkStatus>({
    isOnline: navigator.onLine,
    latency: null,
    status: navigator.onLine ? 'good' : 'offline',
});

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [latency, setLatency] = useState<number | null>(null);
    const [status, setStatus] = useState<'good' | 'poor' | 'offline'>(
        navigator.onLine ? 'good' : 'offline'
    );

    const ping = useCallback(async () => {
        if (!navigator.onLine) return;

        const start = Date.now();
        try {
            // Ping the health endpoint
            const response = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
            if (response.ok) {
                const end = Date.now();
                const currentLatency = end - start;
                setLatency(currentLatency);
                setStatus(currentLatency > 500 ? 'poor' : 'good');
            } else {
                setStatus('poor');
            }
        } catch (e) {
            setStatus('poor');
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setStatus('good');
            ping();
        };
        const handleOffline = () => {
            setIsOnline(false);
            setStatus('offline');
            setLatency(null);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic ping every 30 seconds
        const interval = setInterval(ping, 30000);
        ping(); // Initial ping

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [ping]);

    return (
        <NetworkStatusContext.Provider value={{ isOnline, latency, status }}>
            {children}
            {status === 'poor' && (
                <div className="fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold text-sm">Slow Connection Detected</span>
                </div>
            )}
        </NetworkStatusContext.Provider>
    );
};
