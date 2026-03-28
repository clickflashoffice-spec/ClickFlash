import React, { useMemo, useState, useEffect } from 'react';
import Card from '../../../common/Card.tsx';
import { Expense, ExpenseCategory } from '../../../../types.ts';
import { apiService } from '../../../../services/apiService.ts';
import { useCurrency } from '../../../CurrencyContext.tsx';

interface CostCategoryWidgetProps {
  expenses: Expense[];
}

const CostCategoryWidget: React.FC<CostCategoryWidgetProps> = ({ expenses }) => {
    const { formatCurrency } = useCurrency();
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

    useEffect(() => {
        apiService.getExpenseCategories().then(setExpenseCategories);
    }, []);

    const categoryTotals = useMemo(() => {
        const totals = new Map<string, number>();
        expenses.forEach(expense => {
            totals.set(expense.category, (totals.get(expense.category) || 0) + expense.cost);
        });
        return Array.from(totals.entries())
            .map(([categoryId, total]) => ({
                category: categoryId,
                label: expenseCategories.find(c => c.id === categoryId)?.label || categoryId,
                total
            }))
            .sort((a, b) => b.total - a.total);
    }, [expenses, expenseCategories]);
    
    const maxTotal = useMemo(() => Math.max(...categoryTotals.map(c => c.total), 0), [categoryTotals]);

    return (
        <Card className="h-full">
            <h3 className="text-lg font-bold mb-4">Costs by Category</h3>
            <div className="space-y-3">
                {categoryTotals.map(({ label, total }) => (
                    <div key={label}>
                        <div className="flex justify-between items-baseline text-sm mb-1">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                            <span className="font-mono font-semibold">{formatCurrency(total)}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div 
                                className="bg-red-500 h-2.5 rounded-full" 
                                style={{ width: `${maxTotal > 0 ? (total / maxTotal) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
                 {categoryTotals.length === 0 && <p className="text-slate-500 text-center py-8">No expense data available.</p>}
            </div>
        </Card>
    );
};

export default CostCategoryWidget;