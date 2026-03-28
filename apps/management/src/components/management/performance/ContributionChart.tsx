import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '../../ThemeContext.tsx';
import { useCurrency } from '../../CurrencyContext.tsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface PerformanceData {
    name: string;
    netContribution: number;
}

interface ContributionChartProps {
  data: PerformanceData[];
}

const ContributionChart: React.FC<ContributionChartProps> = ({ data }) => {
    const { theme } = useTheme();
    const { currency } = useCurrency();

    const chartData = useMemo(() => {
        const sortedData = [...data].sort((a, b) => a.netContribution - b.netContribution);
        
        const labels = sortedData.map(p => p.name);
        const chartValues = sortedData.map(p => p.netContribution * currency.rate);
        const backgroundColors = chartValues.map(value => value >= 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)');
        const borderColors = chartValues.map(value => value >= 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)');
        
        return {
            labels,
            datasets: [
                {
                    label: `Net Contribution in ${currency.code}`,
                    data: chartValues,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 4,
                },
            ],
        };
    }, [data, currency]);

    const options = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed.x !== null) {
                             label += new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.code }).format(context.parsed.x);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                grid: { display: false },
                ticks: { color: theme === 'dark' ? '#cbd5e1' : '#475569' }
            },
            x: {
                grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                ticks: {
                    color: theme === 'dark' ? '#94a3b8' : '#64748b',
                    callback: (value: string | number) => {
                        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
                        return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.code, notation: 'compact' }).format(numericValue);
                    }
                }
            }
        }
    };

    return (
        <Bar options={options} data={chartData} />
    );
};

export default ContributionChart;
