import React from 'react';

interface StatusIndicatorProps {
    status: 'connected' | 'disconnected' | 'checking';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    if (status === 'checking') {
        return (
            <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <span className="font-mono font-bold text-xs text-yellow-600 dark:text-yellow-400">
                    CHECKING...
                </span>
            </div>
        );
    }
    
    return (
        <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></span>
            <span className={`font-mono font-bold text-xs ${status === 'connected' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {status.toUpperCase()}
            </span>
        </div>
    );
};
