import { Spinner } from "@clickflash/ui";
import React, { useState, useEffect } from "react";
import Chart from "react-apexcharts";
import { analyticsService } from "../../../services/api/analyticsService";
import { useCurrency } from "../../CurrencyContext";
import {
  TrendingUp,
  Eye,
  CheckSquare,
  ShoppingCart,
  Percent,
  Award,
} from "lucide-react";

interface AlbumAnalyticsProps {
  albumId: string;
}

const AlbumAnalytics: React.FC<AlbumAnalyticsProps> = ({ albumId }) => {
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await analyticsService.getAlbumAnalytics(albumId);
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [albumId]);

  if (loading)
    return (
      <div className="flex items-center justify-center p-20">
        <Spinner />
      </div>
    );
  if (!data)
    return (
      <div className="p-10 text-center text-slate-500">
        No analytics data available for this album.
      </div>
    );

  const stats = data?.stats ?? {
    totalRevenue: 0,
    totalViews: 0,
    totalOrders: 0,
  };
  const topPhotos = data?.topPhotos ?? [];
  const conversionStats = data?.conversionStats ?? {
    conversionRate: 0,
    views: 0,
    selections: 0,
    orders: 0,
  };

  const conversionChartOptions: any = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        distributed: true,
        barHeight: "60%",
      },
    },
    colors: ["#3b82f6", "#8b5cf6", "#10b981"],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString(),
    },
    xaxis: {
      categories: ["Views", "Selections", "Purchases"],
      labels: { style: { colors: "#94a3b8" } },
    },
    yaxis: {
      labels: { style: { colors: "#94a3b8" } },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
    legend: { show: false },
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2 text-blue-600">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Revenue
            </span>
          </div>
          <h3 className="text-2xl font-black dark:text-white">
            {formatCurrency(stats.totalRevenue)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Confirmed orders only
          </p>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2 text-purple-600">
            <Eye className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Engagement
            </span>
          </div>
          <h3 className="text-2xl font-black dark:text-white">
            {stats.totalViews.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Total photo views</p>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2 text-emerald-600">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Orders
            </span>
          </div>
          <h3 className="text-2xl font-black dark:text-white">
            {stats.totalOrders}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Completion count</p>
        </div>
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2 text-orange-600">
            <Percent className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Conversion
            </span>
          </div>
          <h3 className="text-2xl font-black dark:text-white">
            {conversionStats.conversionRate.toFixed(1)}%
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Views to Orders</p>
        </div>
      </div>

      {/* Main Charts Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Funnel */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-900 dark:text-white mb-6">
            Sales Conversion Funnel
          </h4>
          <Chart
            options={conversionChartOptions}
            series={[
              {
                name: "Count",
                data: [
                  conversionStats.views,
                  conversionStats.selections,
                  conversionStats.orders,
                ],
              },
            ]}
            type="bar"
            height={250}
          />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                Selection Rate
              </p>
              <p className="text-lg font-black dark:text-white">
                {conversionStats.views > 0
                  ? (
                      (conversionStats.selections / conversionStats.views) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <p className="text-[10px] text-slate-500 font-bold uppercase">
                Checkout Rate
              </p>
              <p className="text-lg font-black dark:text-white">
                {conversionStats.selections > 0
                  ? (
                      (conversionStats.orders / conversionStats.selections) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        {/* Top Selling Photos */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900 dark:text-white">
              Top Performing Photos
            </h4>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {topPhotos.map((photo: any, i: number) => (
              <div
                key={photo.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <img
                      src={photo.url}
                      alt={photo.title || "Photo"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                    #{i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold dark:text-white truncate">
                    {photo.title || `Photo ${photo.id.slice(0, 5)}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Eye className="h-3 w-3" /> {photo.viewCount}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-purple-500">
                      <CheckSquare className="h-3 w-3" /> {photo.selectionCount}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {photo.salesCount} Sales
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {photo.viewCount > 0
                      ? ((photo.salesCount / photo.viewCount) * 100).toFixed(1)
                      : 0}
                    % Conv.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumAnalytics;
