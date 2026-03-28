import React, { useMemo, useState } from "react";
import {
  ShoppingBag,
  TrendingUp,
  Calendar,
  Filter,
  Users,
  Target,
} from "lucide-react";
import { Order } from "../../../types";
import { analyticsUtils } from "../../../utils/analyticsUtils";
import StatCard from "../../common/StatCard";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface DashboardIncomeAnalyticsProps {
  orders: Order[];
  formatCurrency: (amount: number) => string;
}

const DashboardIncomeAnalytics: React.FC<DashboardIncomeAnalyticsProps> = ({
  orders,
  formatCurrency,
}) => {
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");

  const analyticsData = useMemo(() => {
    const groups = analyticsUtils.groupOrdersByDate(orders, period);
    const sortedKeys = Object.keys(groups).sort();

    return {
      labels: sortedKeys,
      revenue: sortedKeys.map((k) => groups[k].total),
      counts: sortedKeys.map((k) => groups[k].count),
    };
  }, [orders, period]);

  const stats = useMemo(() => {
    const totalRevenue = analyticsData.revenue.reduce((sum, r) => sum + r, 0);
    const totalOrders = analyticsData.counts.reduce((sum, c) => sum + c, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate trends (comparing last data point to predecessor)
    const len = analyticsData.revenue.length;
    const getTrend = (data: number[]) => {
      if (len < 2) return 0;
      const current = data[len - 1];
      const prev = data[len - 2];
      return prev > 0 ? ((current - prev) / prev) * 100 : 0;
    };

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenueTrend: getTrend(analyticsData.revenue),
      orderTrend: getTrend(analyticsData.counts),
      avgOrderTrend: getTrend(
        analyticsData.revenue.map((r, i) =>
          analyticsData.counts[i] > 0 ? r / analyticsData.counts[i] : 0,
        ),
      ),
    };
  }, [analyticsData]);

  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: ["#06b6d4", "#3b82f6"],
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100, 100, 100],
      },
    },
    xaxis: {
      categories: analyticsData.labels,
      labels: {
        rotate: -45,
        style: { fontWeight: 600, fontSize: "10px" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatCurrency(val),
        style: { fontWeight: 600 },
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
  };

  const chartSeries = [
    {
      name: "Revenue",
      data: analyticsData.revenue,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Analytics Controls */}
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-bold text-slate-700">
            Time Resolution
          </span>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {["day", "month", "year"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                period === p
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<ShoppingBag className="w-5 h-5" />}
          trend={stats.revenueTrend >= 0 ? "up" : "down"}
          sub={`${Math.abs(stats.revenueTrend).toFixed(1)}% vs Prev`}
        />
        <StatCard
          title="Order Volume"
          value={stats.totalOrders.toString()}
          icon={<ShoppingBag className="w-5 h-5" />}
          trend={stats.orderTrend >= 0 ? "up" : "down"}
          sub={`${Math.abs(stats.orderTrend).toFixed(1)}% vs Prev`}
        />
        <StatCard
          title="Avg. Order Value"
          value={formatCurrency(stats.avgOrderValue)}
          icon={<Target className="w-5 h-5" />}
          trend={stats.avgOrderTrend >= 0 ? "up" : "down"}
          sub={`${Math.abs(stats.avgOrderTrend).toFixed(1)}% vs Prev`}
        />
      </div>

      {/* Main Income Chart */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              Revenue Trends
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Financial Performance Over Time
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
        <div className="h-[450px]">
          <ReactApexChart
            options={chartOptions}
            series={chartSeries}
            type="area"
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardIncomeAnalytics);

