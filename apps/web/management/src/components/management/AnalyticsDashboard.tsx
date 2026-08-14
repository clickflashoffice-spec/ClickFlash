import React, { useState, useEffect } from 'react';
import { AreaChart, BarChart } from '@tremor/react';
import { DollarSign, Activity } from 'lucide-react';
import { cloudApiService } from '../../services/cloudApiService';
import { logger } from "@/utils/logger";

interface RevenueData {
  date: string;
  revenue: number;
}

interface ConversionData {
  date: string;
  total_sessions: number;
  paid_sessions: number;
  conversion_rate: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [revRes, convRes] = await Promise.all([
          cloudApiService.get('/api/analytics/revenue'),
          cloudApiService.get('/api/analytics/conversion')
        ]);
        
        const revPayload = revRes.data as any;
        const convPayload = convRes.data as any;
        if (revPayload?.success) setRevenueData(revPayload.data.reverse());
        if (convPayload?.success) setConversionData(convPayload.data.reverse());
      } catch (error) {
        logger.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Analytics...</div>;
  }

  const formattedRevData = revenueData.map((d) => ({
    Date: d.date.split('-').slice(1).join('/'),
    Revenue: d.revenue || 0,
  }));

  const formattedConvData = conversionData.map((d) => ({
    Date: d.date.split('-').slice(1).join('/'),
    "Conversion Rate": d.conversion_rate || 0,
  }));

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Gross Revenue (30 Days)</h3>
          </div>
          <div className="h-64">
            <AreaChart
              className="h-full"
              data={formattedRevData}
              index="Date"
              categories={['Revenue']}
              colors={['emerald']}
              valueFormatter={(number: number) => `$${number.toFixed(2)}`}
              showLegend={false}
            />
          </div>
        </div>

        {/* Conversion Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Conversion Rate</h3>
          </div>
          <div className="h-64">
            <BarChart
              className="h-full"
              data={formattedConvData}
              index="Date"
              categories={['Conversion Rate']}
              colors={['blue']}
              valueFormatter={(number: number) => `${number.toFixed(1)}%`}
              showLegend={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
