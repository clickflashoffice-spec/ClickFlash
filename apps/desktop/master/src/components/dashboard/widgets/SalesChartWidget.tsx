import { Card } from "@clickflash/ui";
import React, { useMemo } from 'react';
import { AreaChart } from '@tremor/react';
import { Order } from '../../../types';
import { useCurrency } from '../../CurrencyContext';

interface SalesChartWidgetProps {
    orders: Order[];
}

const SalesChartWidget: React.FC<SalesChartWidgetProps> = React.memo(({ orders }) => {
    const { formatCurrency } = useCurrency();

    const chartData = useMemo(() => {
        const salesByDate = new Map<string, number>();
        orders.forEach(order => {
            if (order.status === 'Completed') {
                salesByDate.set(order.date, (salesByDate.get(order.date) || 0) + order.total);
            }
        });

        const sortedDates = Array.from(salesByDate.keys()).sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );

        return sortedDates.map(dateString => {
            const date = new Date(dateString);
            const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return {
                date: formattedDate,
                Sales: salesByDate.get(dateString) || 0,
            };
        });
    }, [orders]);

    if (chartData.length === 0) {
        return (
            <Card>
                <h3 className="text-sm sm:text-base md:text-lg font-bold mb-2 sm:mb-3 md:mb-4">Sales Over Time</h3>
                <div className="h-48 sm:h-56 md:h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 sm:p-4 rounded-full w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 sm:mb-3 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">No sales data</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">Sales will appear here once orders are completed</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <h3 className="text-sm sm:text-base md:text-lg font-bold mb-2 sm:mb-3 md:mb-4">Sales Over Time</h3>
            <div className="h-48 sm:h-56 md:h-64">
                <AreaChart
                    className="h-full"
                    data={chartData}
                    index="date"
                    categories={['Sales']}
                    colors={['blue']}
                    valueFormatter={(number: number) => formatCurrency(number)}
                    showLegend={false}
                    showGridLines={false}
                    startEndOnly={false}
                />
            </div>
        </Card>
    );
});

SalesChartWidget.displayName = 'SalesChartWidget';

export default SalesChartWidget;
