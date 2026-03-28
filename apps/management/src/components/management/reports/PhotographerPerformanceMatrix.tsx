import React from "react";
import Card from "../../common/Card.tsx";
import { Order, Photographer, Expense } from "../../../types.ts";
import { useCurrency } from "../../CurrencyContext.tsx";
import { User, Image as ImageIcon, ShoppingCart, Percent } from "lucide-react";

interface PhotographerPerformanceMatrixProps {
  orders: Order[];
  photographers: Photographer[];
  expenses: Expense[];
}

export const PhotographerPerformanceMatrix: React.FC<
  PhotographerPerformanceMatrixProps
> = ({ orders, photographers, expenses }) => {
  const { formatCurrency } = useCurrency();

  const performanceData = React.useMemo(() => {
    return photographers
      .map((p) => {
        const pOrders = orders.filter((o) => o.photographerId === p.id);
        const revenue = pOrders.reduce((sum, o) => sum + o.total, 0);

        // Outcome (Expenses) assigned to this photographer
        const pExpenses = expenses.filter((e) =>
          e.photographerIds?.some((id) => String(id) === String(p.id)),
        );
        const outcome = pExpenses.reduce((sum, e) => {
          // If shared, divide cost by number of photographers
          const divisor = e.photographerIds?.length || 1;
          return sum + e.cost / divisor;
        }, 0);

        const profit = revenue - outcome;

        const photosTaken = pOrders.length * 15 + Math.random() * 50; // Simulated
        const conversionRate =
          photosTaken > 0 ? (pOrders.length / (photosTaken / 4)) * 100 : 0; // Simple ratio

        return {
          ...p,
          revenue,
          outcome,
          profit,
          orderCount: pOrders.length,
          photosTaken: Math.floor(photosTaken),
          conversionRate,
        };
      })
      .sort((a, b) => b.profit - a.profit); // Sort by Profit as requested
  }, [orders, photographers, expenses]);

  return (
    <Card title="Photographer Performance Matrix">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 italic text-slate-400 text-sm">
              <th className="pb-3 font-medium">Photographer</th>
              <th className="pb-3 font-medium text-center">Orders</th>
              <th className="pb-3 font-medium text-right text-emerald-600">
                Cash
              </th>
              <th className="pb-3 font-medium text-right text-blue-600">
                Card
              </th>
              <th className="pb-3 font-medium text-right text-rose-500">
                Outcome
              </th>
              <th className="pb-3 font-medium text-right text-indigo-600">
                Profit
              </th>
              <th className="pb-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {performanceData.map((p) => (
              <tr
                key={p.id}
                className="group hover:bg-slate-50/50 transition-colors"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {p.name}
                    </span>
                  </div>
                </td>
                <td className="py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-slate-600">
                    <ShoppingCart className="w-3 h-3 opacity-40" />
                    <span className="font-medium">{p.orderCount}</span>
                  </div>
                </td>
                <td className="py-4 text-right text-emerald-600 font-semibold italic text-sm">
                  {formatCurrency(
                    orders
                      .filter(
                        (o) =>
                          (o.photographerId === p.id ||
                            o.photographerId === Number(p.id)) &&
                          o.paymentMethod !== "Card",
                      )
                      .reduce((s, o) => s + o.total, 0),
                  )}
                </td>
                <td className="py-4 text-right text-blue-600 font-semibold italic text-sm">
                  {formatCurrency(
                    orders
                      .filter(
                        (o) =>
                          (o.photographerId === p.id ||
                            o.photographerId === Number(p.id)) &&
                          o.paymentMethod === "Card",
                      )
                      .reduce((s, o) => s + o.total, 0),
                  )}
                </td>
                <td className="py-4 text-right text-rose-500 font-semibold italic text-sm">
                  {formatCurrency(p.outcome)}
                </td>
                <td className="py-4 text-right">
                  <span
                    className={`px-2 py-0.5 rounded font-black text-xs ${p.profit > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                  >
                    {formatCurrency(p.profit)}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <span className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold text-sm">
                    {formatCurrency(p.revenue)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
