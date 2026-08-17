import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Camera, CheckCircle, Clock, Zap } from 'lucide-react';

const keeperRateData = [
  { date: 'Mon', rate: 72 },
  { date: 'Tue', rate: 75 },
  { date: 'Wed', rate: 71 },
  { date: 'Thu', rate: 80 },
  { date: 'Fri', rate: 82 },
  { date: 'Sat', rate: 85 },
  { date: 'Sun', rate: 84 },
];

const throughputData = [
  { date: 'Mon', photos: 4500 },
  { date: 'Tue', photos: 5200 },
  { date: 'Wed', photos: 4800 },
  { date: 'Thu', photos: 6100 },
  { date: 'Fri', photos: 8500 },
  { date: 'Sat', photos: 12400 },
  { date: 'Sun', photos: 11200 },
];

export function IngestionAnalytics() {
  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Processed (7d)</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400"><Camera className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-white">52.7K</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Keeper Rate</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><CheckCircle className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-white">78.4%</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Grading Time</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400"><Clock className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-white">12.5ms</p>
        </div>
        
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Master OS Sync</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400"><Zap className="w-4 h-4" /></div>
          </div>
          <p className="text-3xl font-extrabold text-white">99.9%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-200 text-base font-bold mb-6">Keeper Rate Over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={keeperRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <h3 className="text-slate-200 text-base font-bold mb-6">Ingestion Volume</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px' }} />
                <Bar dataKey="photos" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
