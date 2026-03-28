import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card.tsx';
import { Photographer, Order, Expense } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';
import ContributionChart from './performance/ContributionChart';

type TimeFilter = 'All Time' | 'This Month' | 'This Year';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
);


const PerformancePage: React.FC = () => {
    const [photographers, setPhotographers] = useState<Photographer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('All Time');
    const { formatCurrency } = useCurrency();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [users, ordersData, expensesData] = await Promise.all([
                    apiService.getUsers(),
                    apiService.getOrders(),
                    apiService.getExpenses(),
                ]);
                setPhotographers(users);
                setOrders(ordersData);
                setExpenses(expensesData);
            } catch (err) {
                console.error("Failed to load photographer data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const performanceData = useMemo(() => {
        if (loading || !photographers || !orders || !expenses) return [];

        let timeFilteredOrders = orders;
        let timeFilteredExpenses = expenses;
        const now = new Date();

        if (timeFilter === 'This Month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            timeFilteredOrders = orders.filter(o => o.date >= startOfMonth);
            timeFilteredExpenses = expenses.filter(e => e.date >= startOfMonth);
        } else if (timeFilter === 'This Year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            timeFilteredOrders = orders.filter(o => o.date >= startOfYear);
            timeFilteredExpenses = expenses.filter(e => e.date >= startOfYear);
        }
        
        return photographers.map(p => {
            const sales = timeFilteredOrders
                .filter(o => o.photographerId === p.id && o.status === 'Completed')
                .reduce((sum, o) => sum + o.total, 0);
            
            const costs = timeFilteredExpenses
                .filter(e => e.photographerId === p.id)
                .reduce((sum, e) => sum + e.cost, 0);
                
            const netContribution = sales - costs;
            
            return {
                ...p,
                totalSales: sales,
                totalCosts: costs,
                netContribution,
                orderCount: timeFilteredOrders.filter(o => o.photographerId === p.id).length
            };
        }).sort((a, b) => b.netContribution - a.netContribution);
    }, [photographers, orders, expenses, loading, timeFilter]);

    if (loading) return <Spinner />;
    
    const totalNetContribution = performanceData.reduce((sum, p) => sum + p.netContribution, 0);
    const topPerformer = performanceData.length > 0 ? performanceData[0] : null;

    const filterOptions: TimeFilter[] = ['All Time', 'This Year', 'This Month'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl font-bold">Photographer Performance</h1>
                 <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {filterOptions.map(option => (
                        <button
                            key={option}
                            onClick={() => setTimeFilter(option)}
                            className={`px-3 py-1.5 rounded-md font-semibold text-sm transition-colors ${
                                timeFilter === option
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                 <StatCard 
                    title="Total Net Contribution" 
                    value={formatCurrency(totalNetContribution)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                />
                 <StatCard 
                    title="Top Performer" 
                    value={topPerformer ? topPerformer.name : 'N/A'}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="!p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="p-4">Photographer</th>
                                        <th className="p-4 text-right">Total Sales</th>
                                        <th className="p-4 text-right">Assigned Costs</th>
                                        <th className="p-4 text-right">Net Contribution</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceData.map(p => (
                                        <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                            <td className="p-4 font-semibold flex items-center space-x-3">
                                                <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full" />
                                                <span>{p.name}</span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-green-500 dark:text-green-400">{formatCurrency(p.totalSales)}</td>
                                            <td className="p-4 text-right font-mono text-red-500 dark:text-red-400">{formatCurrency(p.totalCosts)}</td>
                                            <td className={`p-4 text-right font-mono font-bold ${p.netContribution >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'}`}>{formatCurrency(p.netContribution)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold mb-4">Net Contribution Chart</h3>
                        <div className="h-96">
                            <ContributionChart data={performanceData.map(p => ({ name: p.name, netContribution: p.netContribution }))} />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PerformancePage;
