import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Card from '../../../common/Card';
import { Order, Expense } from '../../../../types';
import { useTheme } from '../../../ThemeContext';
import { useCurrency } from '../../../CurrencyContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface RevenueProfitChartWidgetProps {
  orders: Order[];
  expenses: Expense[];
}

const RevenueProfitChartWidget: React.FC<RevenueProfitChartWidgetProps> = ({ orders, expenses }) => {
    const { theme } = useTheme();
    const { currency } = useCurrency();
    const chartRef = useRef<any>(null);
    const [gradients, setGradients] = useState<{ revenue: CanvasGradient | string, profit: CanvasGradient | string }>({ revenue: 'transparent', profit: 'transparent' });

    useEffect(() => {
        const chart = chartRef.current;
        if (chart) {
            const ctx = chart.ctx;
            
            const revGradient = ctx.createLinearGradient(0, 0, 0, 350);
            revGradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)'); // Green-500
            revGradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

            const profGradient = ctx.createLinearGradient(0, 0, 0, 350);
            profGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // Blue-500
            profGradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

            setGradients({ revenue: revGradient, profit: profGradient });
        }
    }, [theme]);

    const chartConfig = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return { year: d.getFullYear(), month: d.getMonth() };
        }).reverse();

        const labels = months.map(m => new Date(m.year, m.month).toLocaleString('default', { month: 'short', year: '2-digit'}));

        const revenueByMonth: number[] = Array(12).fill(0);
        const expensesByMonth: number[] = Array(12).fill(0);

        orders.forEach(order => {
            if (order.status === 'Completed') {
                const orderDate = new Date(order.date);
                const monthIndex = months.findIndex(m => m.year === orderDate.getFullYear() && m.month === orderDate.getMonth());
                if (monthIndex !== -1) {
                    revenueByMonth[monthIndex] += order.total * currency.rate;
                }
            }
        });

        expenses.forEach(expense => {
            const expenseDate = new Date(expense.date);
            const monthIndex = months.findIndex(m => m.year === expenseDate.getFullYear() && m.month === expenseDate.getMonth());
            if (monthIndex !== -1) {
                expensesByMonth[monthIndex] += expense.cost * currency.rate;
            }
        });

        const profitByMonth = revenueByMonth.map((revenue, i) => revenue - expensesByMonth[i]);

        const data = {
            labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueByMonth,
                    borderColor: 'rgb(34, 197, 94)', // Green-500
                    backgroundColor: gradients.revenue,
                    borderWidth: 2,
                    pointBackgroundColor: 'rgb(34, 197, 94)',
                    pointBorderColor: theme === 'dark' ? '#1e293b' : '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: 'Net Profit',
                    data: profitByMonth,
                    borderColor: 'rgb(59, 130, 246)', // Blue-500
                    backgroundColor: gradients.profit,
                    borderWidth: 2,
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
                legend: {
                    position: 'top' as const,
                    align: 'end' as const,
                    labels: {
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        usePointStyle: true,
                        boxWidth: 8,
                        font: { size: 11, weight: 'bold' as const }
                    }
                },
                tooltip: {
                    backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    titleColor: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    bodyColor: theme === 'dark' ? '#cbd5e1' : '#475569',
                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4,
                    titleFont: { size: 13, weight: 'bold' as const },
                    callbacks: {
                        label: (context: any) => {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.code, maximumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { 
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false,
                    },
                    ticks: { 
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        font: { size: 10 },
                        maxTicksLimit: 6,
                        callback: (value: any) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.code, notation: 'compact' }).format(value)
                    },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        font: { size: 10 },
                        maxRotation: 0,
                        autoSkip: true
                    },
                    border: { display: false }
                }
            },
            interaction: {
                mode: 'index' as const,
                intersect: false,
            }
        };

        return { data, options };
    }, [orders, expenses, theme, currency, gradients]);

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Financial Performance</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Revenue vs. Net Profit (Trailing 12 Months)</p>
                </div>
            </div>
            <div className="flex-grow h-72 relative w-full">
                <Line ref={chartRef} options={chartConfig.options} data={chartConfig.data} />
            </div>
        </Card>
    );
};

export default RevenueProfitChartWidget;