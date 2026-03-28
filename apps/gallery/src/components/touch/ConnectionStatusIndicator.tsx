
import React, { useState, useEffect } from 'react';
import { webSocketService } from '../../services/webSocketService.ts';

interface ConnectionStatusIndicatorProps {
  status: 'Connected' | 'Disconnected';
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ status }) => {
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [isChecking, setIsChecking] = useState(false);

    const checkOfflineOrders = async () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            setIsChecking(true);
            try {
                const orders = await webSocketService.getOfflineOrders();
                setUnsyncedCount(orders.length);
            } catch (error) {
                console.error("Could not get offline order count:", error);
            } finally {
                setTimeout(() => setIsChecking(false), 500); // Min duration for visual feedback
            }
        }
    };

    useEffect(() => {
        checkOfflineOrders();
        const interval = setInterval(checkOfflineOrders, 10000); // Check periodically every 10s

        return () => {
            clearInterval(interval);
        };
    }, [status]);

    const isConnected = status === 'Connected';

    return (
        <button 
            onClick={checkOfflineOrders}
            className={`fixed bottom-6 left-6 p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg flex items-center space-x-3 z-50 no-print transition-transform active:scale-95 hover:bg-white dark:hover:bg-slate-800 cursor-pointer border border-transparent ${isChecking ? 'border-blue-300 dark:border-blue-700' : ''}`}
            title="Click to refresh connection status"
        >
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isChecking ? 'animate-pulse' : ''}`}></div>
            <span className={`font-semibold ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isConnected ? 'Connected to Master' : 'Disconnected'}
            </span>
            {unsyncedCount > 0 && (
                <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400 font-semibold text-sm border-l pl-3 ml-2 border-slate-300 dark:border-slate-600">
                    <span className="bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 rounded">{unsyncedCount}</span>
                    <span>Offline</span>
                </div>
            )}
        </button>
    );
};

export default ConnectionStatusIndicator;
