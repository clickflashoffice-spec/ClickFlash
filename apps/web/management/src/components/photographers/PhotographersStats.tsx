import React from "react";
import StatCard from "../common/StatCard.tsx";
import { Users, TrendingUp, Activity, DollarSign } from "lucide-react";
import { useCurrency } from "../CurrencyContext.tsx";

interface KpiData {
  totalPhotographers: number;
  topPerformer: string;
  mostActive: string;
  averageSales: number;
}

interface PhotographersStatsProps {
  kpiData: KpiData;
}

export const PhotographersStats: React.FC<PhotographersStatsProps> = ({
  kpiData,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Photographers"
        value={kpiData.totalPhotographers.toString()}
        icon={<Users className="w-5 h-5" />}
        className="bg-gradient-to-br from-cyan-50 to-blue-50"
      />
      <StatCard
        title="Top Performer"
        value={kpiData.topPerformer}
        icon={<TrendingUp className="w-5 h-5" />}
        className="bg-gradient-to-br from-green-50 to-emerald-50"
      />
      <StatCard
        title="Most Active"
        value={kpiData.mostActive}
        icon={<Activity className="w-5 h-5" />}
        className="bg-gradient-to-br from-amber-50 to-orange-50"
      />
      <StatCard
        title="Average Sales"
        value={formatCurrency(kpiData.averageSales)}
        icon={<DollarSign className="w-5 h-5" />}
        className="bg-gradient-to-br from-purple-50 to-pink-50"
      />
    </div>
  );
};

export default PhotographersStats;