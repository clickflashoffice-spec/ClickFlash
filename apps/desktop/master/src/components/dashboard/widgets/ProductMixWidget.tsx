import { Card } from "@clickflash/ui";
import React, { useMemo } from 'react';

import { Order } from '../../../types';
import { useCurrency } from '../../CurrencyContext';
import Chart from 'react-apexcharts';
import { useTheme } from '../../ThemeContext';

interface ProductMixWidgetProps {
    orders: Order[];
}

const ProductMixWidget: React.FC<ProductMixWidgetProps> = ({ orders }) => {
    const { formatCurrency } = useCurrency();
    const { theme } = useTheme();

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

        return {
            labels: sorted.map(s => s[0]),
            series: sorted.map(s => s[1]),
            total: totalRevenue
        };
    }, [orders]);

    const chartOptions: any = {
        chart: {
            type: 'donut',
            fontFamily: 'Inter, system-ui, sans-serif'
        },
        labels: stats.labels,
        colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
        legend: {
            position: 'bottom',
            fontSize: '11px',
            labels: {
                colors: theme === 'dark' ? '#94a3b8' : '#64748b'
            },
            markers: {
                radius: 4
            }
        },
        stroke: {
            show: false
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        name: {
                            show: true,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: theme === 'dark' ? '#94a3b8' : '#64748b'
                        },
                        value: {
                            show: true,
                            fontSize: '18px',
                            fontWeight: 700,
                            color: theme === 'dark' ? '#ffffff' : '#1e293b',
                            formatter: (val: number) => formatCurrency(val)
                        },
                        total: {
                            show: true,
                            label: 'Total Revenue',
                            fontSize: '10px',
                            fontWeight: 500,
                            color: theme === 'dark' ? '#64748b' : '#94a3b8',
                            formatter: () => formatCurrency(stats.total)
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        tooltip: {
            theme: theme,
            y: {
                formatter: (val: number) => formatCurrency(val)
            }
        }
    };

    if (stats.series.length === 0) {
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
                <Chart
                    options={chartOptions}
                    series={stats.series}
                    type="donut"
                    width="100%"
                    height={320}
                />
            </div>
        </Card>
    );
};

export default ProductMixWidget;
