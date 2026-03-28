import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../../common/Card';
import { Order } from '../../../types';
import { useTheme } from '../../ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface SalesChartWidgetProps {
  orders: Order[];
}

const SalesChartWidget: React.FC<SalesChartWidgetProps> = React.memo(({ orders }) => {
    const { theme } = useTheme();

    const chartConfig = useMemo(() => {
        const salesByDate = new Map<string, number>();
        orders.forEach(order => {
            if (order.status === 'Completed') {
                salesByDate.set(order.date, (salesByDate.get(order.date) || 0) + order.total);
            }
        });

        const sortedDates = Array.from(salesByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        const labels = sortedDates.map(dateString => {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        
        const dataValues = sortedDates.map(date => salesByDate.get(date) || 0);

        const data = {
            labels,
            datasets: [
                {
                    label: 'Sales',
                    data: dataValues,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.4,
                    fill: true,
                },
            ],
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
            },
            scales: {
                y: {
                    grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                    ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: theme === 'dark' ? '#94a3b8' : '#64748b' }
                }
            }
        };

        return { data, options };
    }, [orders, theme]);

    if (chartConfig.data.labels.length === 0) {
        return (
            <Card>
                <h3 className="text-lg font-bold mb-4">Sales Over Time</h3>
                <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">No sales data</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sales will appear here once orders are completed</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <h3 className="text-lg font-bold mb-4">Sales Over Time</h3>
            <div className="h-64">
                <Line options={chartConfig.options} data={chartConfig.data} />
            </div>
        </Card>
    );
});

SalesChartWidget.displayName = 'SalesChartWidget';

export default SalesChartWidget;
