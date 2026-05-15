import React, { useMemo, useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Expense, ExpenseCategory } from "../../../types";
import { apiService } from "../../../services/apiService";
import { useTheme } from "../../ThemeContext";

const CHART_COLORS = [
  "rgba(255,99,132,0.85)",
  "rgba(54,162,235,0.85)",
  "rgba(255,206,86,0.85)",
  "rgba(75,192,192,0.85)",
  "rgba(153,102,255,0.85)",
  "rgba(255,159,64,0.85)",
  "rgba(99,255,132,0.85)",
];

interface ExpensePieChartProps {
  expenses: Expense[];
}

const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ expenses }) => {
  const { theme } = useTheme();
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );

  useEffect(() => {
    apiService.getExpenseCategories().then(setExpenseCategories);
  }, []);

  const data = useMemo(() => {
    const expenseByCategory = new Map<string, number>();
    expenses.forEach((expense) => {
      expenseByCategory.set(
        expense.category,
        (expenseByCategory.get(expense.category) || 0) + expense.cost,
      );
    });

    return Array.from(expenseByCategory.entries()).map(([catId, value]) => ({
      name:
        expenseCategories.find((c) => c.id === catId)?.label || catId,
      value,
    }));
  }, [expenses, expenseCategories]);

  return (
    <div className="h-96">
      {expenses.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius="65%"
              label={false}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 2,
                }).format(Number(value))
              }
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                color: theme === "dark" ? "#fff" : "#000",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-500">
            No expense data for the selected period.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpensePieChart;
