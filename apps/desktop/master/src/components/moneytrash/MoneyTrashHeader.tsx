import React from 'react';
import PageHeader from '../common/PageHeader';

interface MoneyTrashHeaderProps {
    enabled: boolean;
    status: string;
    cloudStatus: 'online' | 'offline' | 'checking';
}

export const MoneyTrashHeader: React.FC<MoneyTrashHeaderProps> = ({ 
    enabled, 
    status, 
    cloudStatus 
}) => {
    return (
        <PageHeader
            title={
                <div className="flex items-center gap-3">
                    <span>MoneyTrash Strategy</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${enabled
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                        {enabled ? 'Active' : 'Disabled'}
                    </span>
                    {status === 'paused' && (
                        <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                            Paused
                        </span>
                    )}
                </div>
            }
            subtitle="Monetize unsold photos via automated watermarked retention gallery."
            actions={
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cloudStatus === 'online'
                    ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${cloudStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs font-bold uppercase">
                        {cloudStatus === 'checking' ? 'Checking...' : cloudStatus === 'online' ? 'Cloud Online' : 'Cloud Offline'}
                    </span>
                </div>
            }
        />
    );
};
