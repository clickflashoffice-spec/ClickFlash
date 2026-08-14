import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { Download, RefreshCw, AlertCircle, DollarSign, Image as ImageIcon, Store } from 'lucide-react';
import { cloudApiService } from '../services/cloudApiService';

interface FinancialSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  gallerySales: number;
  inPersonSales: number;
}

interface DailyTrend {
  date: string;
  orders: number;
  revenue: number;
  gallerySales: number;
  inPersonSales: number;
}

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [dailyData, setDailyData] = useState<DailyTrend[]>([]);
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cloudApiService.getFinancials(startDate, endDate) as {
        success?: boolean;
        message?: string;
        summary?: FinancialSummary;
        dailyTrend?: DailyTrend[];
      };
      if (data.success) {
        if (!data.summary) throw new Error('Analytics response did not include a summary');
        setSummary(data.summary);
        setDailyData(data.dailyTrend || []);
      } else {
        throw new Error(data.message || 'Failed to load analytics');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleExportCSV = () => {
    if (!dailyData.length) return;
    
    const headers = ['Date,Orders,Total Revenue,Gallery Sales,In-Person Sales'];
    const rows = dailyData.map(d => 
      `${d.date},${d.orders},${d.revenue},${d.gallerySales},${d.inPersonSales}`
    );
    
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_export_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Analytics</h2>
          <p className="text-white/60 text-sm">Track your studio and gallery revenue</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#131C31] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-white/60">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-[#131C31] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={loading || !dailyData.length}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start space-x-3 border border-red-100">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!error && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#131C31] p-5 rounded-xl border border-white/10 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-white/60">Total Revenue</p>
              <div className="p-2 bg-emerald-900/30 text-emerald-400 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              ${summary.totalRevenue.toFixed(2)}
            </h3>
          </div>

          <div className="bg-[#131C31] p-5 rounded-xl border border-white/10 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-white/60">Average Order</p>
              <div className="p-2 bg-blue-900/30 text-cyan-400 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              ${summary.averageOrderValue.toFixed(2)}
            </h3>
          </div>

          <div className="bg-[#131C31] p-5 rounded-xl border border-white/10 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-white/60">In-Person Sales</p>
              <div className="p-2 bg-purple-900/30 text-purple-400 rounded-lg">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              ${summary.inPersonSales.toFixed(2)}
            </h3>
          </div>

          <div className="bg-[#131C31] p-5 rounded-xl border border-white/10 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-white/60">Gallery Sales</p>
              <div className="p-2 bg-amber-900/30 text-amber-400 rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              ${summary.gallerySales.toFixed(2)}
            </h3>
          </div>
        </div>
      )}

      {!error && dailyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#131C31] p-6 rounded-xl border border-white/10 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-6">Revenue Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#131C31', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} name="Total Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#131C31] p-6 rounded-xl border border-white/10 shadow-sm">
            <h3 className="text-lg font-semibold text-white mb-6">Sales Channel Breakdown</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, '']}
                    contentStyle={{ backgroundColor: '#131C31', color: '#fff', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}
                  />
                  <Legend />
                  <Bar dataKey="inPersonSales" stackId="a" fill="#8b5cf6" name="In-Person Sales" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="gallerySales" stackId="a" fill="#06b6d4" name="Gallery Sales" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
