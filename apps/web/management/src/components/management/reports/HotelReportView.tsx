import React from "react";
import { Card } from "@clickflash/ui";
import { Order, Expense, Photographer } from "../../../types.ts";
import { useCurrency } from "../../CurrencyContext.tsx";
import { TrendingUp, Users, DollarSign, Camera } from "lucide-react";

interface HotelReportViewProps {
  orders: Order[];
  expenses: Expense[];
  photographers: Photographer[];
  guestsCount?: number;
  viewingSessionsCount?: number;
}

export const HotelReportView: React.FC<HotelReportViewProps> = ({
  orders,
  expenses,
  photographers: photographers,
  guestsCount = 0,
  viewingSessionsCount = 0,
}) => {
  const { formatCurrency } = useCurrency();

  const metrics = React.useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalTransactions = orders.length;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.cost, 0);

    const captureRate =
      guestsCount > 0 ? (orders.length / guestsCount) * 100 : 0;
    const conversionRate =
      viewingSessionsCount > 0
        ? (totalTransactions / viewingSessionsCount) * 100
        : 0;
    const aov = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const netMargin = totalRevenue - totalExpenses;

    const revenueByMethod = orders.reduce(
      (acc, o) => {
        const method = o.paymentMethod || "Cash"; // Default to Cash if not specified
        acc[method] = (acc[method] || 0) + o.total;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalRevenue,
      totalTransactions,
      captureRate,
      conversionRate,
      aov,
      netMargin,
      revenueByMethod,
    };
  }, [orders, expenses, guestsCount, viewingSessionsCount]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Capture Rate"
          value={`${metrics.captureRate.toFixed(1)}%`}
          target=">15%"
          status={metrics.captureRate >= 15 ? "success" : "warning"}
          icon={Camera}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          target=">40%"
          status={metrics.conversionRate >= 40 ? "success" : "warning"}
          icon={TrendingUp}
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(metrics.aov)}
          target=">€45"
          status={metrics.aov >= 45 ? "success" : "warning"}
          icon={Users}
        />
        <MetricCard
          title="Net Margin"
          value={formatCurrency(metrics.netMargin)}
          status={metrics.netMargin > 0 ? "success" : "danger"}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue vs Expenses">
          <div className="h-64 flex items-center justify-center text-slate-400">
            [Revenue vs Expenses Trend Chart]
          </div>
        </Card>

        <Card title="Payment Methods Breakdown">
          <div className="space-y-4 pt-4">
            {Object.entries(metrics.revenueByMethod).map(([method, amount]) => (
              <div
                key={method}
                className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${method === "Card" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}
                  >
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-700">
                    {method} Payments
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">
                    {formatCurrency(amount)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {((amount / metrics.totalRevenue) * 100).toFixed(1)}% of
                    total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  target?: string;
  status: "success" | "warning" | "danger";
  icon: React.ElementType;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  target,
  status,
  icon: Icon,
}) => {
  const statusColors = {
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    danger: "text-red-600 bg-red-50 border-red-100",
  };

  return (
    <div
      className={`p-4 rounded-2xl border ${statusColors[status]} transition-all hover:shadow-md`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 rounded-xl bg-white/50">
          <Icon className="w-5 h-5" />
        </div>
        {target && (
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Target: {target}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium opacity-80 mb-1">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
