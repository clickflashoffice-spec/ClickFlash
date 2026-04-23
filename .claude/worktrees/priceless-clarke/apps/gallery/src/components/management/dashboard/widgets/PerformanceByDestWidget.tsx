import React, { useMemo } from 'react';
import Card from '../../../common/Card';
import { Order, Expense, Destination } from '../../../../types';
import { useCurrency } from '../../../CurrencyContext';

interface PerformanceByDestWidgetProps {
  orders: Order[];
  expenses: Expense[];
  destinations: Destination[];
}

const PerformanceByDestWidget: React.FC<PerformanceByDestWidgetProps> = ({ orders, expenses, destinations }) => {
    const { formatCurrency } = useCurrency();
    
    const performanceData = useMemo(() => {
        return destinations.map(dest => {
            const revenue = orders
                .filter(o => o.destinationId === dest.id)
                .reduce((sum, o) => sum + o.total, 0);
            const costs = expenses
                .filter(e => e.destinationId === dest.id)
                .reduce((sum, e) => sum + e.cost, 0);
            const profit = revenue - costs;
            return {
                ...dest,
                revenue,
                costs,
                profit
            };
        }).sort((a, b) => b.profit - a.profit);
    }, [destinations, orders, expenses]);

    return (
        <Card className="!p-0">
             <h3 className="text-lg font-bold p-4">Performance by Destination</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="p-4">Destination</th>
                            <th className="p-4 text-right">Revenue</th>
                            <th className="p-4 text-right">Costs</th>
                            <th className="p-4 text-right">Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {performanceData.map((d) => (
                            <tr key={d.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                <td className="p-4 font-semibold">{d.name}</td>
                                <td className="p-4 text-right font-mono text-green-500 dark:text-green-400">{formatCurrency(d.revenue)}</td>
                                <td className="p-4 text-right font-mono text-red-500 dark:text-red-400">{formatCurrency(d.costs)}</td>
                                <td className={`p-4 text-right font-mono font-bold ${d.profit >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>{formatCurrency(d.profit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default PerformanceByDestWidget;
