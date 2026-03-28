
import React, { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { analyticsService, AnalyticsSummary, HourlyStat, PhotographerStat } from '../services/api/analyticsService';
import { analyticsExportService } from '../services/api/analyticsExportService';
import { useCurrency } from './CurrencyContext';
import { Download, RefreshCw, TrendingUp, Users, Package } from 'lucide-react';
import Spinner from './common/Spinner';
import PageHeader from './common/PageHeader';

interface AnalyticsViewProps {
    embedded?: boolean;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ embedded = false }) => {
    const { formatCurrency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [hourly, setHourly] = useState<HourlyStat[]>([]);
    const [photographers, setPhotographers] = useState<PhotographerStat[]>([]);
    const [days, setDays] = useState(30);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const [s, h, p] = await Promise.all([
                analyticsService.getSummary(days),
                analyticsService.getHourly(),
                analyticsService.getPhotographers(days)
            ]);
            setSummary(s);
            setHourly(h);
            setPhotographers(p);
        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [days]);

    const hourlyChartOptions: any = {
        chart: {
            id: 'hourly-revenue',
            toolbar: { show: false },
            zoom: { enabled: false },
            sparkline: { enabled: false }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [50, 100, 100]
            }
        },
        colors: ['#3b82f6'],
        xaxis: {
            categories: hourly?.map(h => h.hour) || [],
            labels: {
                style: { colors: '#94a3b8' }
            }
        },
        yaxis: {
            labels: {
                formatter: (val: number) => formatCurrency(val || 0),
                style: { colors: '#94a3b8' }
            }
        },
        grid: {
            borderColor: '#f1f5f9',
            strokeDashArray: 4
        },
        tooltip: {
            theme: 'light',
            y: {
                formatter: (val: number) => formatCurrency(val || 0)
            }
        }
    };

    const productChartOptions: any = {
        chart: {
            type: 'donut'
        },
        labels: summary?.productBreakdown?.map(p => p.productName) || [],
        colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
        legend: {
            position: 'bottom',
            labels: {
                colors: '#64748b'
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            formatter: () => formatCurrency(summary?.revenue || 0)
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full min-h-[50vh]"><Spinner /></div>;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Standardized Header - Only show when not embedded */}
            {!embedded && (
                <PageHeader
                    title="Business Intelligence"
                    subtitle="Real-time performance and revenue insights"
                    actions={
                        <div className="flex items-center gap-2">
                            <select
                                value={days}
                                onChange={(e) => setDays(parseInt(e.target.value))}
                                title="Select period"
                                aria-label="Select period"
                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value={7}>Last 7 Days</option>
                                <option value={30}>Last 30 Days</option>
                                <option value={90}>Last 3 Months</option>
                            </select>
                            <button
                                onClick={() => fetchData()}
                                title="Refresh"
                                aria-label="Refresh"
                                className={`p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                            >
                                <RefreshCw className="h-4 w-4 text-slate-500" />
                            </button>
                            <button
                                onClick={() => summary && analyticsExportService.exportSummaryToCSV(summary, days)}
                                title="Export Data"
                                aria-label="Export data"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                <span>Export</span>
                            </button>
                        </div>
                    }
                />
            )}

            {/* Embedded Mode Controls */}
            {embedded && (
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold dark:text-white">Business Intelligence</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Real-time performance and revenue insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value))}
                            title="Select period"
                            aria-label="Select period"
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value={7}>Last 7 Days</option>
                            <option value={30}>Last 30 Days</option>
                            <option value={90}>Last 3 Months</option>
                        </select>
                        <button
                            onClick={() => fetchData()}
                            title="Refresh"
                            aria-label="Refresh"
                            className={`p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                            onClick={() => summary && analyticsExportService.exportSummaryToCSV(summary, days)}
                            title="Export Data"
                            aria-label="Export data"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+12.5%</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Revenue</p>
                    <h3 className="text-3xl font-bold dark:text-white mt-1">{formatCurrency(summary?.revenue || 0)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Package className="h-6 w-6 text-purple-600" />
                        </div>
                        <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">+8.2%</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Orders Completed</p>
                    <h3 className="text-3xl font-bold dark:text-white mt-1">{summary?.orders || 0}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-fuchsia-500/10 rounded-xl">
                            <Users className="h-6 w-6 text-fuchsia-600" />
                        </div>
                        <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full">Top Performer</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg Order Value</p>
                    <h3 className="text-3xl font-bold dark:text-white mt-1">
                        {formatCurrency(summary?.orders ? (summary.revenue / summary.orders) : 0)}
                    </h3>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold dark:text-white">Hourly Revenue Breakdown</h4>
                        <span className="text-xs text-slate-500">Today</span>
                    </div>
                    {hourly && hourly.length > 0 ? (
                        <Chart
                            key="hourly-chart"
                            options={hourlyChartOptions}
                            series={[{ name: 'Revenue', data: hourly.map(h => h.revenue || 0) }]}
                            type="area"
                            height={300}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-gray-400">
                            No hourly data available
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold dark:text-white">Product Mix</h4>
                        <span className="text-xs text-slate-500">Revenue Contribution</span>
                    </div>
                    <div className="flex flex-col items-center">
                        {summary?.productBreakdown && summary.productBreakdown.length > 0 ? (
                            <Chart
                                key="product-chart"
                                options={productChartOptions}
                                series={summary.productBreakdown.map(p => p.revenue || 0)}
                                type="donut"
                                width="100%"
                                height={300}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-400">
                                No product data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Albums Row */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold dark:text-white">Top Performing Albums</h4>
                    <span className="text-xs text-slate-500">By Estimated Revenue</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(summary?.productBreakdown || []).slice(0, 3).map((album, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group hover:border-blue-500/30 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black px-2 py-0.5 bg-blue-500 text-white rounded uppercase">Top {i + 1}</span>
                                <TrendingUp className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h5 className="font-bold text-slate-900 dark:text-white truncate">{album.productName}</h5>
                            <div className="mt-4 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Est. Revenue</p>
                                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{formatCurrency(album.revenue)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Growth</p>
                                    <p className="text-xs font-bold text-emerald-500">+{15 - i * 2}%</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Photographer Performance Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
                    <h4 className="font-bold dark:text-white">Photographer Performance Rankings</h4>
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">Last {days} Days</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-700/50">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Photographer</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Orders</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Revenue</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Avg Order</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {photographers.map((p, idx) => (
                                <tr key={p.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                                                {p.name.charAt(0)}
                                            </div>
                                            <span className="font-semibold dark:text-slate-200">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{p.orderCount}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(p.revenue)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatCurrency(p.avgOrderValue)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-3 min-w-[120px]">
                                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"

                                                    style={{ width: `${Math.min((p.revenue / (photographers[0]?.revenue || 1)) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;
