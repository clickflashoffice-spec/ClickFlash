
import React, { useMemo } from 'react';
import { Photographer, Order, Album } from '../../../types.ts';

interface PhotographerPerformanceWidgetProps {
    photographers: Photographer[];
    orders: Order[];
    albums: Album[];
    formatCurrency: (amount: number) => string;
}

/**
 * PhotographerPerformanceWidget Component
 * 
 * Displays performance metrics for top photographers.
 * 
 * @param {PhotographerPerformanceWidgetProps} props - Component props
 */
const PhotographerPerformanceWidget: React.FC<PhotographerPerformanceWidgetProps> = ({
    photographers,
    orders,
    albums,
    formatCurrency
}) => {
    const performanceData = useMemo(() => {
        return photographers.map(p => {
            const pOrders = orders.filter(o => o.photographerId === p.id && o.status === 'Completed');
            const pAlbums = albums.filter(a => a.photographerId === p.id);

            const revenue = pOrders.reduce((sum, o) => sum + o.total, 0);
            const photosTaken = pAlbums.reduce((sum, a) => sum + (a.photos?.length || 0), 0);

            return {
                ...p,
                revenue,
                photosTaken,
                albumsCreated: pAlbums.length,
                orderCount: pOrders.length,
                avgOrderValue: pOrders.length > 0 ? revenue / pOrders.length : 0
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }, [photographers, orders, albums]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Top Performers</h3>
                    <p className="text-sm text-slate-500">Highest revenue photographers</p>
                </div>
                <button className="text-sm text-cyan-600 hover:text-cyan-700 font-medium hover:underline">
                    View All
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="pb-3 pl-2">Photographer</th>
                            <th className="pb-3 text-right">Revenue</th>
                            <th className="pb-3 text-right hidden sm:table-cell">Sales</th>
                            <th className="pb-3 text-right hidden md:table-cell">Photos</th>
                            <th className="pb-3 text-right hidden lg:table-cell">Avg Value</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {performanceData.map((photographer, index) => (
                            <tr key={photographer.id} className="group hover:bg-slate-50 transition-colors text-sm">
                                <td className="py-3 pl-2">
                                    <div className="flex items-center space-x-3">
                                        <div className={`
                                            flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                                            ${index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400/30' :
                                                index === 1 ? 'bg-slate-100 text-slate-700 ring-2 ring-slate-300' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-300' :
                                                        'bg-slate-50 text-slate-500'}
                                        `}>
                                            {index + 1}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                                {photographer.name}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate max-w-[100px] sm:max-w-none">
                                                {/* Location data requires join */}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 text-right font-bold text-slate-900">
                                    {formatCurrency(photographer.revenue)}
                                </td>
                                <td className="py-3 text-right text-slate-600 hidden sm:table-cell">
                                    {photographer.orderCount}
                                </td>
                                <td className="py-3 text-right text-slate-600 hidden md:table-cell">
                                    {photographer.photosTaken.toLocaleString()}
                                </td>
                                <td className="py-3 text-right text-slate-500 hidden lg:table-cell">
                                    {formatCurrency(photographer.avgOrderValue)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {performanceData.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <p>No performance data available</p>
                </div>
            )}
        </div>
    );
};

export default React.memo(PhotographerPerformanceWidget);

