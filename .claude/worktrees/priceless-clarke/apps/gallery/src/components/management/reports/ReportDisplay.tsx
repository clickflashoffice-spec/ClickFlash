import React, { useMemo } from 'react';
import { Order, Expense } from '../../../types';
import { useCurrency } from '../../CurrencyContext';

interface ReportDisplayProps {
  orders: Order[];
  expenses: Expense[];
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({ orders, expenses }) => {
    const { formatCurrency } = useCurrency();

    const reportData = useMemo(() => {
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.cost, 0);
        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalExpenses,
            netProfit,
            profitMargin,
            totalOrders: orders.length,
            totalExpensesCount: expenses.length,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        };
    }, [orders, expenses]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-center">Profit &amp; Loss Statement</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Revenue" value={formatCurrency(reportData.totalRevenue)} color="text-green-400" />
                <StatCard title="Total Expenses" value={formatCurrency(reportData.totalExpenses)} color="text-red-400" />
                <StatCard title="Net Profit" value={formatCurrency(reportData.netProfit)} color={reportData.netProfit >= 0 ? "text-blue-400" : "text-red-400"} />
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Orders" value={reportData.totalOrders.toLocaleString()} />
                <StatCard title="Average Order Value" value={formatCurrency(reportData.averageOrderValue)} />
                <StatCard title="Profit Margin" value={`${reportData.profitMargin.toFixed(2)}%`} color={reportData.profitMargin >= 0 ? "text-green-400" : "text-red-400"}/>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string; color?: string }> = ({ title, value, color = "text-white dark:text-white" }) => (
    <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);

export default ReportDisplay;
