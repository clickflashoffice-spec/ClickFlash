import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Card from '../common/Card.tsx';
import { Order, Photographer } from '../../types.ts';
import { useTheme } from '../ThemeContext.tsx';
import { useCurrency } from '../CurrencyContext.tsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface IncomeByPhotographerChartProps {
    orders: Order[];
    photographers: Photographer[];
}

const IncomeByPhotographerChart: React.FC<IncomeByPhotographerChartProps> = ({ orders, photographers }) => {
    const { theme } = useTheme();
    const { currency } = useCurrency();

    const chartData = useMemo(() => {
        const salesMap = new Map<string, number>();
        orders.forEach(order => {
            if (order.status === 'Completed') {
                const pId = String(order.photographerId);
                salesMap.set(pId, (salesMap.get(pId) || 0) + order.total);
            }
        });

        const dataPoints = photographers.map(p => ({
            name: p.name,
            sales: salesMap.get(String(p.id)) || 0,
        })).sort((a, b) => b.sales - a.sales);

        const labels = dataPoints.map(p => p.name);
        const data = dataPoints.map(p => p.sales * currency.rate);

        return {
            labels,
            datasets: [
                {
                    label: `Sales in ${currency.code}`,
                    data,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ],
        };
    }, [orders, photographers, currency]);

    const options = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.raw as number || 0;
                        label += new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: currency.code
                        }).format(value);
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: theme === 'dark' ? '#cbd5e1' : '#475569',
                }
            },
            x: {
                grid: {
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: theme === 'dark' ? '#94a3b8' : '#64748b',
                    callback: (value: string | number) => {
                        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
                        return new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: currency.code,
                            notation: 'compact'
                        }).format(numericValue)
                    }
                }
            }
        }
    };

    return (
        <Card className="h-full">
            <h3 className="text-lg font-bold mb-4">Income by Photographer</h3>
            <div className="h-[22rem]">
                <Bar options={options} data={chartData} />
            </div>
        </Card>
    );
};

export default IncomeByPhotographerChart;