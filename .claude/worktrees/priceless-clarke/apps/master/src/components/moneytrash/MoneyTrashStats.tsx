import React from 'react';

interface MoneyTrashStatsProps {
    queues?: {
        retention: number;
        fulfillment: number;
        retentionProgress?: number;
        fulfillmentProgress?: number;
    };
    price: number;
}

export const MoneyTrashStats: React.FC<MoneyTrashStatsProps> = ({ queues, price }) => {
    const potentialRevenue = (queues?.retention || 0) * price;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Queue Size</div>
                <div className="text-4xl font-black text-slate-900 dark:text-white">{queues?.retention || 0}</div>
                <div className="text-xs text-slate-400 mt-2">Photos pending upload to cloud gallery</div>

                {queues?.retention !== undefined && queues.retention > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            <span>Sync Progress</span>
                            <span>{queues.retentionProgress || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                                style={{ width: `${queues.retentionProgress || 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Potential Revenue</div>
                <div className="text-4xl font-black text-green-600 dark:text-green-400">
                    €{potentialRevenue.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400 mt-2">Based on €{price.toFixed(2)} per photo × {queues?.retention || 0} queued</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Fulfilled Orders</div>
                <div className="text-4xl font-black text-blue-600 dark:text-blue-400">{queues?.fulfillment || 0}</div>
                <div className="text-xs text-slate-400 mt-2">Orders pending delivery</div>

                {queues?.fulfillment !== undefined && queues.fulfillment > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            <span>Fulfillment Progress</span>
                            <span>{queues.fulfillmentProgress || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500 rounded-full"
                                style={{ width: `${queues.fulfillmentProgress || 0}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
