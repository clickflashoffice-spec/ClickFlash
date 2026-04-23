
import React, { useMemo } from 'react';
import { Destination, Order } from '../../../types.ts';

interface RevenueByDestinationWidgetProps {
    destinations: Destination[];
    orders: Order[];
    timeFilter: string;
    formatCurrency: (amount: number) => string;
    detailed?: boolean;
}

/**
 * RevenueByDestinationWidget Component
 * 
 * Displays revenue breakdown by destination with visual charts.
 * 
 * @param {RevenueByDestinationWidgetProps} props - Component props
 */
const RevenueByDestinationWidget: React.FC<RevenueByDestinationWidgetProps> = ({
    destinations,
    orders,
    timeFilter,
    formatCurrency,
    detailed = false
}) => {
    const destinationData = useMemo(() => {
        const data = destinations.map(dest => {
            const destOrders = orders.filter(o => o.destinationId === dest.id && o.status === 'Completed');
            const revenue = destOrders.reduce((sum, o) => sum + o.total, 0);
            const orderCount = destOrders.length;

            return {
                ...dest,
                revenue,
                orderCount,
                avgOrderValue: orderCount > 0 ? revenue / orderCount : 0
            };
        }).sort((a, b) => b.revenue - a.revenue);

        const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

        return { data, totalRevenue };
    }, [destinations, orders]);

    const maxRevenue = Math.max(...destinationData.data.map(d => d.revenue), 1);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Revenue by Destination</h3>
                    <p className="text-sm text-slate-500">Performance across all locations</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(destinationData.totalRevenue)}
                    </p>
                    <p className="text-xs text-slate-500">Total Revenue</p>
                </div>
            </div>

            <div className="space-y-4">
                {destinationData.data.map((dest, index) => {
                    const percentage = maxRevenue > 0 ? (dest.revenue / maxRevenue) * 100 : 0;
                    const revenuePercentage = destinationData.totalRevenue > 0
                        ? (dest.revenue / destinationData.totalRevenue) * 100
                        : 0;

                    return (
                        <div key={dest.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{dest.name}</p>
                                        <p className="text-xs text-slate-500">{dest.country}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900">
                                        {formatCurrency(dest.revenue)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {dest.orderCount} orders
                                    </p>
                                </div>
                            </div>

                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="absolute h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            {detailed && (
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                                    <span>{revenuePercentage.toFixed(1)}% of total</span>
                                    <span>Avg: {formatCurrency(dest.avgOrderValue)}</span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {destinationData.data.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p>No destination data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(RevenueByDestinationWidget);

