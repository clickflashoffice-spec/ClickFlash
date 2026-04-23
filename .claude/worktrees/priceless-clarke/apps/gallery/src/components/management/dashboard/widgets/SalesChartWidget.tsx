
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../../../common/Card';
import { Order } from '../../../../types';
import { useTheme } from '../../../ThemeContext';
import { useCurrency } from '../../../CurrencyContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface SalesChartWidgetProps {
  orders: Order[];
}

const SalesChartWidget: React.FC<SalesChartWidgetProps> = ({ orders }) => {
    const { theme } = useTheme();
    const { currency } = useCurrency();
    const chartRef = useRef<any>(null);
    const [gradient, setGradient] = useState<CanvasGradient | null>(null);

    useEffect(() => {
        const chart = chartRef.current;
        if (chart) {
            const ctx = chart.ctx;
            const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
            if (theme === 'dark') {
                gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
                gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
            } else {
                gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
            }
            setGradient(gradientFill);
        }
    }, [theme]);

    const chartConfig = useMemo(() => {
        const salesByDate = new Map<string, number>();
        
        orders.forEach(order => {
            if (order.status === 'Completed') {
                salesByDate.set(order.date, (salesByDate.get(order.date) || 0) + order.total);
            }
        });

        const sortedDates = Array.from(salesByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
        // Display last 14 days for cleaner look
        const displayDates = sortedDates.slice(-14);
        
        const labels = displayDates.map(dateString => {
            const date = new Date(dateString);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        
        const dataValues = displayDates.map(date => (salesByDate.get(date) || 0) * currency.rate);

        const data = {
            labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: dataValues,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: gradient || 'rgba(59, 130, 246, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: theme === 'dark' ? '#1e293b' : '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
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
                tooltip: {
                    backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    bodyColor: theme === 'dark' ? '#cbd5e1' : '#475569',
                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: { size: 13, weight: 'bold' as const },
                    bodyFont: { size: 12, family: "'Inter', sans-serif" },
                    callbacks: {
                        label: (context: any) => {
                            return `Revenue: ${new Intl.NumberFormat(undefined, {
                                style: 'currency',
                                currency: currency.code
                            }).format(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    border: { display: false },
                    grid: { 
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        drawTicks: false,
                        borderDash: [5, 5],
                    },
                    ticks: { 
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        font: { family: "'Inter', sans-serif", size: 11 },
                        maxTicksLimit: 5,
                        padding: 10,
                        callback: (value: any) => new Intl.NumberFormat(undefined, { 
                            style: 'currency', 
                            currency: currency.code,
                            notation: 'compact' 
                        }).format(value)
                    }
                },
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: { 
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        font: { family: "'Inter', sans-serif", size: 11 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 7,
                        padding: 10
                    }
                }
            },
            interaction: {
                mode: 'index' as const,
                intersect: false,
            }
        };

        return { data, options };
    }, [orders, theme, currency, gradient]);

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Revenue Trend</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Performance over the last 14 days</p>
                </div>
            </div>
            <div className="flex-grow h-64 w-full relative">
                <Line ref={chartRef} options={chartConfig.options} data={chartConfig.data} />
            </div>
        </Card>
    );
};

export default SalesChartWidget;
