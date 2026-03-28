import React from "react";
import Card from "../../common/Card.tsx";
import { useCurrency } from "../../CurrencyContext.tsx";

interface GlobalStatsWidgetProps {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    activeKiosks: number;
    totalPhotos: number;
  };
}

import StatCard from "../../common/StatCard.tsx";

/**
 * GlobalStatsWidget Component
 *
 * Displays high-level global statistics for the dashboard.
 *
 * @param {GlobalStatsWidgetProps} props - Component props
 */
const GlobalStatsWidget: React.FC<GlobalStatsWidgetProps> = React.memo(
  ({ stats }) => {
    const { formatCurrency } = useCurrency();

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"
              />
            </svg>
          }
          colorClass="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders.toLocaleString()}
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          }
          colorClass="bg-gradient-to-br from-blue-400 to-blue-600"
        />
        <StatCard
          title="Active Kiosks"
          value={stats.activeKiosks.toString()}
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z"
              />
            </svg>
          }
          colorClass="bg-gradient-to-br from-amber-400 to-amber-600"
        />
        <StatCard
          title="Total Photos"
          value={stats.totalPhotos.toLocaleString()}
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          colorClass="bg-gradient-to-br from-purple-400 to-purple-600"
        />
      </div>
    );
  },
);

GlobalStatsWidget.displayName = "GlobalStatsWidget";

export default React.memo(GlobalStatsWidget);

