import React, { useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Hotel,
  Globe,
  ShoppingBag,
  Activity,
} from "lucide-react";
import { Order, Expense, Destination } from "../../../types";
import { analyticsUtils } from "../../../utils/analyticsUtils";
import StatCard from "../../common/StatCard";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface DashboardProfitabilityProps {
  orders: Order[];
  expenses: Expense[];
  destinations: Destination[];
  formatCurrency: (amount: number) => string;
}

const DashboardProfitability: React.FC<DashboardProfitabilityProps> = ({
  orders,
  expenses,
  destinations,
  formatCurrency,
}) => {
  const profitabilityData = useMemo(() => {
    return analyticsUtils.calculateProfitability(
      destinations,
      orders,
      expenses,
    );
  }, [destinations, orders, expenses]);

  const stats = useMemo(() => {
    const totalIncome = profitabilityData.reduce((sum, d) => sum + d.income, 0);
    const totalExpenses = profitabilityData.reduce(
      (sum, d) => sum + d.expenses,
      0,
    );
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return { totalIncome, totalExpenses, netProfit, profitMargin };
  }, [profitabilityData]);

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        distributed: true,
        horizontal: true,
        barHeight: "60%",
      },
    },
    colors: ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => formatCurrency(val),
      style: { fontWeight: 900 },
    },
    xaxis: {
      categories: profitabilityData.map((d) => d.name),
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: { show: false },
    legend: { show: false },
  };

  const chartSeries = [
    {
      name: "Profit",
      data: profitabilityData.map((d) => d.profit),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Global Profitability Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Income"
          value={formatCurrency(stats.totalIncome)}
          icon={<ShoppingBag className="w-5 h-5" />}
          trend="neutral"
          sub="Global"
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(stats.totalExpenses)}
          icon={<ShoppingBag className="w-5 h-5" />}
          trend="neutral"
          sub="Global"
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.netProfit)}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={stats.netProfit >= 0 ? "up" : "down"}
          sub="Net"
        />
        <StatCard
          title="Profit Margin"
          value={`${stats.profitMargin.toFixed(1)}%`}
          icon={<Activity className="w-5 h-5" />}
          trend={stats.profitMargin >= 30 ? "up" : "down"}
          sub="Target 30%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profitability by Destination Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Net Profit by Location
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Global Ranking
            </p>
          </div>
          <div className="h-[400px]">
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="bar"
              height="100%"
            />
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Performance Breakdown
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Per Hotel Details
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="text-left border-b border-slate-100">
                <tr>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hotel
                  </th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Profit
                  </th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profitabilityData.map((dest) => (
                  <tr
                    key={dest.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <Hotel className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          {dest.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <span
                        className={`text-sm font-black ${dest.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {formatCurrency(dest.profit)}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="text-xs font-bold text-slate-400">
                        {dest.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardProfitability);

