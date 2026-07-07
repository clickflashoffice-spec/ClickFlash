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
      const response = await fetch(`${cloudApiService.getApiUrl()}/api/analytics/financials?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${cloudApiService.getApiKey()}`, // Assuming the API key is used for auth or we have a token
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setSummary(data.summary);
        setDailyData(data.dailyTrend || []);
      } else {
        throw new Error(data.message || 'Failed to load analytics');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching analytics');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
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
          <h2 className="text-2xl font-bold text-slate-800">Financial Analytics</h2>
          <p className="text-slate-500 text-sm">Track your studio and gallery revenue</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
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
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              ${summary.totalRevenue.toFixed(2)}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Average Order</p>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              ${summary.averageOrderValue.toFixed(2)}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">In-Person Sales</p>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              ${summary.inPersonSales.toFixed(2)}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-slate-500">Gallery Sales</p>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">
              ${summary.gallerySales.toFixed(2)}
            </h3>
          </div>
        </div>
      )}

      {!error && dailyData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Revenue Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Total Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Sales Channel Breakdown</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="inPersonSales" stackId="a" fill="#a855f7" name="In-Person Sales" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="gallerySales" stackId="a" fill="#f59e0b" name="Gallery Sales" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
