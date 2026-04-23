import React from 'react';

interface MoneyTrashQueueProps {
    status: string;
    lastSync?: string;
    onRefresh: () => void;
    onTogglePause: () => void;
    onPurge: () => void;
    enabled: boolean;
    retentionSize: number;
    formatDate: (date?: string) => string;
}

export const MoneyTrashQueue: React.FC<MoneyTrashQueueProps> = ({
    status,
    lastSync,
    onRefresh,
    onTogglePause,
    onPurge,
    enabled,
    retentionSize,
    formatDate
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        Queue Status:
                        <span className={`uppercase px-2 py-0.5 rounded text-sm font-bold ${status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : status === 'error'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : status === 'syncing'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            }`}>
                            {status || 'Idle'}
                        </span>
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Manage the automated upload process. Last sync: {formatDate(lastSync)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={onRefresh}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg transition-colors flex items-center gap-2"
                        title="Refresh data"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Refresh
                    </button>
                    <button
                        onClick={onTogglePause}
                        disabled={!enabled}
                        className={`px-4 py-2 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${status === 'paused'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            }`}
                    >
                        {status === 'paused' ? 'Resume Sync' : 'Pause Queue'}
                    </button>
                    <button
                        onClick={onPurge}
                        disabled={!enabled || retentionSize === 0}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Purge Queue
                    </button>
                </div>
            </div>
        </div>
    );
};
