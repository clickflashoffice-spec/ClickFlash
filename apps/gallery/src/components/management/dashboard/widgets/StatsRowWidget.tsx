import React from 'react';
import Card from '../../../common/Card';
import { Order, Expense } from '../../../../types';
import { useCurrency } from '../../../CurrencyContext';

interface StatsRowWidgetProps {
  orders: Order[];
  expenses: Expense[];
}

const StatCard: React.FC<{ title: string; value: string; colorClass: string, icon: React.ReactNode }> = ({ title, value, colorClass, icon }) => (
    <Card className="flex items-start space-x-4">
        <div className={`p-3 rounded-lg ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
);

const StatsRowWidget: React.FC<StatsRowWidgetProps> = ({ orders, expenses }) => {
    const { formatCurrency } = useCurrency();
    
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalCosts = expenses.reduce((sum, expense) => sum + expense.cost, 0);
    const profit = totalRevenue - totalCosts;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                title="Total Revenue" 
                value={formatCurrency(totalRevenue)}
                colorClass="bg-green-500/10 text-green-400"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
            />
            <StatCard 
                title="Total Costs" 
                value={formatCurrency(totalCosts)}
                colorClass="bg-red-500/10 text-red-400"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
            <StatCard 
                title="Net Profit" 
                value={formatCurrency(profit)}
                colorClass="bg-blue-500/10 text-blue-400"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
        </div>
    );
};

export default StatsRowWidget;
