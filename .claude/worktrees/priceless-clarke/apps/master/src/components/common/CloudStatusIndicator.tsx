import React, { useState, useEffect } from 'react';
import { cloudService } from '../../services/api';

interface CloudStatusIndicatorProps {
    size?: 'small' | 'normal';
}

export const CloudStatusIndicator: React.FC<CloudStatusIndicatorProps> = ({ size = 'normal' }) => {
    const [status, setStatus] = useState<any>(null);
    const [error, setError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const s = await cloudService.getStatus();
                setStatus(s);
                setError(false);
            } catch (err) {
                console.error('Failed to check cloud status', err);
                setError(true);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 300000); // 5 minutes
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (action: 'sync' | 'retention') => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            if (action === 'sync') await cloudService.triggerSync();
            else await cloudService.triggerRetention();
            alert(`${action === 'sync' ? 'Sync' : 'Retention Batch'} Triggered!`);
        } catch (e) {
            alert('Action failed');
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    let iconColor = 'text-slate-400';
    if (status?.success) iconColor = 'text-blue-500';
    if (error) iconColor = 'text-red-500';

    // Scale button based on size prop
    const buttonSizeClass = size === 'small' ? 'w-6 h-6' : 'w-8 h-8';
    // Position menu differently if small (likely in collapsed sidebar)
    const menuPositionClass = size === 'small' ? 'left-full top-0 ml-2' : 'bottom-full mb-2 left-1/2 -translate-x-1/2';

    return (
        <div className="relative">
            <button
                className={`flex items-center justify-center ${buttonSizeClass} rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${iconColor}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Cloud Status & Controls"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className={`absolute ${menuPositionClass} w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50`}>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-1 mb-1">
                        CLOUD CONTROLS
                    </div>
                    <button
                        onClick={() => handleAction('sync')}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                        Force Sync Now
                    </button>
                    <button
                        onClick={() => handleAction('retention')}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                        Run Retention Batch
                    </button>
                </div>
            )}
        </div>
    );
};
