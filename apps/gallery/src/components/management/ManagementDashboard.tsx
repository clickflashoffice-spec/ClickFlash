
import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/apiService.ts';
import { Order, Expense, Destination, Loan, Adjustment, Photographer } from '../../types.ts';
import Spinner from '../common/Spinner.tsx';
import StatsRowWidget from './dashboard/widgets/StatsRowWidget';
import PerformanceByDestWidget from './dashboard/widgets/PerformanceByDestWidget';
import RevenueProfitChartWidget from './dashboard/widgets/RevenueProfitChartWidget';
import LoanOverviewWidget from './dashboard/widgets/LoanOverviewWidget';
import ActivityFeedWidget from './dashboard/widgets/ActivityFeedWidget';
import CostCategoryWidget from './dashboard/widgets/CostCategoryWidget';
import LiveOperationsWidget from './dashboard/widgets/LiveOperationsWidget';

type TimeFilter = '30d' | '90d' | '1y' | 'All';

const ManagementDashboard: React.FC = () => {
    const [data, setData] = useState<{ orders: Order[], expenses: Expense[], destinations: Destination[], loans: Loan[], adjustments: Adjustment[], photographers: Photographer[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('90d');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const [orders, expenses, destinations, loans, adjustments, photographers] = await Promise.all([
                apiService.getOrders(),
                apiService.getExpenses(),
                apiService.getDestinations(),
                apiService.getLoans(),
                apiService.getAdjustments(),
                apiService.getUsers(),
            ]);
            setData({ orders, expenses, destinations, loans, adjustments, photographers });
        } catch (error) {
            console.error("Failed to load management dashboard data", error);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = useMemo(() => {
        if (!data) return null;
        if (timeFilter === 'All') return data;

        const now = new Date();
        let daysToSubtract = 0;
        if (timeFilter === '30d') daysToSubtract = 30;
        if (timeFilter === '90d') daysToSubtract = 90;
        if (timeFilter === '1y') daysToSubtract = 365;
        
        const filterDate = new Date();
        filterDate.setDate(now.getDate() - daysToSubtract);

        return {
            ...data,
            orders: data.orders.filter(o => new Date(o.date) >= filterDate),
            expenses: data.expenses.filter(e => new Date(e.date) >= filterDate),
        };
    }, [data, timeFilter]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error Loading Dashboard</h3>
                <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                <button
                    onClick={() => fetchData()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!filteredData || !data) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    const filterOptions: { id: TimeFilter, label: string }[] = [
        { id: '30d', label: 'Last 30 Days' },
        { id: '90d', label: 'Last 90 Days' },
        { id: '1y', label: 'This Year' },
        { id: 'All', label: 'All Time' },
    ];

    return (
        <div className="space-y-6 animate-fadeIn pb-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                     <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Global Command Center</h1>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor operations, revenue, and performance across all destinations</p>
                 </div>
                 <div className="flex items-center gap-3">
                     <button
                         onClick={() => fetchData(true)}
                         disabled={isRefreshing}
                         className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                         title="Refresh data"
                     >
                         <svg 
                             xmlns="http://www.w3.org/2000/svg" 
                             className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} 
                             fill="none" 
                             viewBox="0 0 24 24" 
                             stroke="currentColor"
                         >
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                         </svg>
                         <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                     </button>
                     <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm">
                        {filterOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => setTimeFilter(option.id)}
                                className={`px-3 py-1.5 rounded-lg font-semibold text-xs md:text-sm transition-all ${
                                    timeFilter === option.id
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                                        : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && data && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">{error}</p>
                        <button
                            onClick={() => fetchData(true)}
                            className="text-xs text-yellow-700 dark:text-yellow-400 hover:underline mt-1"
                        >
                            Try refreshing
                        </button>
                    </div>
                </div>
            )}

            <StatsRowWidget orders={filteredData.orders} expenses={filteredData.expenses} />
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 <div className="lg:col-span-3">
                     <RevenueProfitChartWidget orders={filteredData.orders} expenses={filteredData.expenses} />
                 </div>
                 <div className="lg:col-span-1">
                     <LiveOperationsWidget destinations={data.destinations} />
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <PerformanceByDestWidget orders={filteredData.orders} expenses={filteredData.expenses} destinations={data.destinations} />
                </div>
                 <div>
                    <div className="grid gap-6 h-full">
                         <LoanOverviewWidget loans={data.loans} />
                         <CostCategoryWidget expenses={filteredData.expenses} />
                    </div>
                </div>
            </div>
            
            <div>
                <ActivityFeedWidget 
                    orders={data.orders}
                    expenses={data.expenses}
                    adjustments={data.adjustments}
                    photographers={data.photographers}
                />
            </div>
        </div>
    );
};

export default ManagementDashboard;
