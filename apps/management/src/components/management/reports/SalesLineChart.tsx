import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Order } from '../../../types';
import { useTheme } from '../../ThemeContext';
import { useCurrency } from '../../CurrencyContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface SalesLineChartProps {
  orders: Order[];
}

const SalesLineChart: React.FC<SalesLineChartProps> = ({ orders }) => {
    const { theme } = useTheme();
    const { currency } = useCurrency();

    const chartData = useMemo(() => {
        const salesByDate = new Map<string, number>();
        orders.forEach(order => {
            if (order.status === 'Completed') {
                salesByDate.set(order.date, (salesByDate.get(order.date) || 0) + order.total);
            }
        });

        const sortedDates = Array.from(salesByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const labels = sortedDates.map(date => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const data = sortedDates.map(date => (salesByDate.get(date) || 0) * currency.rate);

        return {
            labels,
            datasets: [
                {
                    label: `Sales in ${currency.code}`,
                    data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.1,
                    fill: true,
                },
            ],
        };
    }, [orders, currency]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Sales Over Time', color: theme === 'dark' ? '#fff' : '#000' },
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

    return (
        <div className="h-96">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default SalesLineChart;
