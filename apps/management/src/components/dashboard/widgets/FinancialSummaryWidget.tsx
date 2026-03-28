import React, { useMemo } from "react";
import { Order } from "../../../types.ts";

interface FinancialSummaryWidgetProps {
  orders: Order[];
  timeFilter: string;
  formatCurrency: (amount: number) => string;
}

import StatCard from "../../common/StatCard.tsx";

/**
 * FinancialSummaryWidget Component
 *
 * Displays comprehensive financial analytics including P&L summary.
 *
 * @param {FinancialSummaryWidgetProps} props - Component props
 */
const FinancialSummaryWidget: React.FC<FinancialSummaryWidgetProps> = ({
  orders,
  timeFilter,
  formatCurrency,
}) => {
  const financialData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case "Today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "7D":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30D":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90D":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1Y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredOrders = orders.filter(
      (o) => new Date(o.date) >= startDate && o.status === "Completed",
    );

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate previous period for comparison
    const periodLength = now.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousOrders = orders.filter(
      (o) =>
        new Date(o.date) >= previousStartDate &&
        new Date(o.date) < startDate &&
        o.status === "Completed",
    );
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);

    const revenueChange =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Group by payment method
    const byPaymentMethod = filteredOrders.reduce(
      (acc, order) => {
        const method = order.paymentMethod || "Unknown";
        acc[method] = (acc[method] || 0) + order.total;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenueChange,
      byPaymentMethod,
    };
  }, [orders, timeFilter]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Financial Summary
          </h3>
          <p className="text-sm text-slate-500">
            P&L overview for {timeFilter.toLowerCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">
            {formatCurrency(financialData.totalRevenue)}
          </p>
          <div
            className={`flex items-center justify-end text-sm font-semibold ${
              financialData.revenueChange >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {financialData.revenueChange >= 0 ? (
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
            )}
            {Math.abs(financialData.revenueChange).toFixed(1)}% vs previous
            period
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Orders"
          value={financialData.totalOrders.toString()}
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(financialData.avgOrderValue)}
        />
        <StatCard
          title="Conversion Rate"
          value="--%"
          sub="Coming soon"
        />
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(financialData.byPaymentMethod).length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">
            Revenue by Payment Method
          </h4>
          <div className="space-y-3">
            {Object.entries(financialData.byPaymentMethod)
              .sort(([, a], [, b]) => b - a)
              .map(([method, amount]) => {
                const percentage = (amount / financialData.totalRevenue) * 100;
                return (
                  <div
                    key={method}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {method}
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={
                            {
                              "--tw-progress": `${percentage}%`,
                            } as React.CSSProperties
                          }
                        />
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FinancialSummaryWidget);

