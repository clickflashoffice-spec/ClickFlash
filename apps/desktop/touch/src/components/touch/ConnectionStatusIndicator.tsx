
import React, { useState, useEffect } from 'react';
import { pb } from '../../services/pb';
import { logger } from '../../utils/logger';

interface ConnectionStatusIndicatorProps {
    status: 'Connected' | 'Disconnected' | 'Offline';
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ status }) => {
    const [unsyncedCount, setUnsyncedCount] = useState(0);
    const [isChecking, setIsChecking] = useState(false);

    const checkOfflineOrders = async () => {
        setIsChecking(true);
        try {
            // Check for pending orders directly from local DB
            const result = await pb.collection('orders').getList(1, 1, {
                filter: 'status = "Pending"',
                fields: 'id'
            });
            setUnsyncedCount(result.totalItems);
        } catch (error) {
            // Silent fail for UI polis
            // logger.warn("Could not get offline order count", { error: error instanceof Error ? error.message : String(error) });
        } finally {
            setTimeout(() => setIsChecking(false), 500); // Min duration for visual feedback
        }
    };

    useEffect(() => {
        checkOfflineOrders();
        const interval = setInterval(checkOfflineOrders, 10000); // Check periodically every 10s

        return () => {
            clearInterval(interval);
        };
    }, [status]);

    const getStatusColor = () => {
        switch (status) {
            case 'Connected': return 'bg-green-500';
            case 'Offline': return 'bg-red-700'; // System Failure / Local DB Down
            case 'Disconnected': return 'bg-orange-500'; // Master Unreachable
            default: return 'bg-red-500';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'Connected': return 'Connected';
            case 'Offline': return 'System Offline';
            case 'Disconnected': return 'Master Unreachable'; // Clearer user feedback
            default: return 'System Error';
        }
    };

    const getTextColor = () => {
        switch (status) {
            case 'Connected': return 'text-green-600 dark:text-green-400';
            case 'Offline': return 'text-red-700 dark:text-red-500';
            case 'Disconnected': return 'text-orange-600 dark:text-orange-400';
            default: return 'text-red-600 dark:text-red-400';
        }
    };

    return (
        <button
            onClick={checkOfflineOrders}
            className={`fixed bottom-6 left-6 p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-lg flex items-center space-x-3 z-50 no-print transition-all active:scale-95 hover:bg-white dark:hover:bg-slate-800 cursor-pointer border border-transparent ${isChecking ? 'border-blue-300 dark:border-blue-700' : ''}`}
            title="Click to refresh connection status"
        >
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isChecking ? 'animate-pulse' : ''}`}></div>
            <span className={`font-semibold ${getTextColor()}`}>
                {getStatusText()}
            </span>
            {unsyncedCount > 0 && (
                <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400 font-semibold text-sm border-l pl-3 ml-2 border-slate-300 dark:border-slate-600">
                    <span className="bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 rounded">{unsyncedCount}</span>
                    <span>Pending</span>
                </div>
            )}
        </button>
    );
};

export default ConnectionStatusIndicator;
