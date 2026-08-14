import { Card } from "@clickflash/ui";
import React, { useMemo } from 'react';
import { DonutChart } from '@tremor/react';
import { Order } from '../../../types';
import { useCurrency } from '../../CurrencyContext';

interface ProductMixWidgetProps {
    orders: Order[];
}

const ProductMixWidget: React.FC<ProductMixWidgetProps> = ({ orders }) => {
    const { formatCurrency } = useCurrency();

    const stats = useMemo(() => {
        const mix = new Map<string, number>();
        let totalRevenue = 0;

        orders.forEach(order => {
            if (order.status === 'Completed' && order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const itemName = item.name || 'Unknown Product';
                    const revenue = item.price * item.quantity;
                    mix.set(itemName, (mix.get(itemName) || 0) + revenue);
                    totalRevenue += revenue;
                });
            }
        });

        const sorted = Array.from(mix.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const data = sorted.map(([name, amount]) => ({
            name,
            amount,
        }));

        return {
            data,
            total: totalRevenue
        };
    }, [orders]);

    if (stats.data.length === 0) {
        return (
            <Card>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h4 className="text-sm sm:text-base font-bold dark:text-white">Product Revenue Mix</h4>
                    <span className="text-[10px] text-slate-500 font-medium">By Category</span>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-500/20 mb-3"></div>
                    <p className="text-xs">No product sales data</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm sm:text-base font-bold dark:text-white">Product Revenue Mix</h4>
                <div className="p-1 px-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-tighter">
                    Intelligence
                </div>
            </div>
            <div className="flex flex-col items-center">
                <DonutChart
                    className="h-64 mt-4"
                    data={stats.data}
                    category="amount"
                    index="name"
                    valueFormatter={(number: number) => formatCurrency(number)}
                    colors={['blue', 'violet', 'fuchsia', 'amber', 'emerald']}
                />
                <div className="mt-3 text-center">
                    <span className="text-xs text-slate-500">Total Revenue: </span>
                    <span className="text-sm font-bold dark:text-white">{formatCurrency(stats.total)}</span>
                </div>
            </div>
        </Card>
    );
};

export default ProductMixWidget;
