import React, { useMemo, useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Expense, ExpenseCategory } from '../../../types';
import { apiService } from '../../../services/apiService';
import { useTheme } from '../../ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpensePieChartProps {
  expenses: Expense[];
}

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ expenses }) => {
    const { theme } = useTheme();
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

    useEffect(() => {
        apiService.getExpenseCategories().then(setExpenseCategories);
    }, []);

    const chartData = useMemo(() => {
        const expenseByCategory = new Map<string, number>();
        expenses.forEach(expense => {
            const currentTotal = expenseByCategory.get(expense.category) || 0;
            expenseByCategory.set(expense.category, currentTotal + expense.cost);
        });

        const labels = Array.from(expenseByCategory.keys()).map(catId => expenseCategories.find(c => c.id === catId)?.label || catId);
        const data = Array.from(expenseByCategory.values());

        return {
            labels,
            datasets: [{
                label: 'Expenses',
                data,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                    'rgba(99, 255, 132, 0.5)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(99, 255, 132, 1)',
                ],
                borderWidth: 1,
            }]
        };
    }, [expenses, expenseCategories]);
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    color: theme === 'dark' ? '#fff' : '#000',
                },
            },
            title: {
                display: true,
                text: 'Expense Breakdown by Category',
                color: theme === 'dark' ? '#fff' : '#000',
            },
        },
    };

    return (
        <div className="h-96">
            {expenses.length > 0 ? (
                <Pie data={chartData} options={options} />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-slate-500">No expense data for the selected period.</p>
                </div>
            )}
        </div>
    );
};

export default ExpensePieChart;