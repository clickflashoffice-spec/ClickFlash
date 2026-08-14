import React, { useMemo } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, CloudRain, Sun, Calendar, Users, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const MOCK_DATA = Array.from({ length: 90 }, (_, i) => {
  const isHistorical = i < 30;
  const baseVal = 5000 + Math.sin(i / 5) * 2000 + (i * 50);
  const date = new Date();
  date.setDate(date.getDate() - 30 + i);
  
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    historicalRevenue: isHistorical ? baseVal + (Math.random() * 1000 - 500) : null,
    predictedRevenue: !isHistorical ? baseVal + (Math.random() * 500 - 250) : null,
    predictedMin: !isHistorical ? baseVal - 800 : null,
    predictedMax: !isHistorical ? baseVal + 800 : null,
  };
});

const STAFFING_RECS = [
  { week: 'Next Week', staff: 12, trend: 'up', reason: 'Holiday weekend surge' },
  { week: 'In 2 Weeks', staff: 8, trend: 'down', reason: 'Post-holiday lull' },
  { week: 'In 3 Weeks', staff: 10, trend: 'stable', reason: 'Normal seasonal baseline' },
];

export const AIDemandForecasting: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" />
          90-Day Demand & Revenue Forecast
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          AI-driven predictive modeling based on historical data, weather patterns, and seasonality.
        </p>
      </div>

      <div className="h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={MOCK_DATA}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={10} />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Area 
              type="monotone" 
              dataKey="historicalRevenue" 
              name="Historical Revenue"
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorHistorical)" 
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="predictedMax" 
              stroke="none" 
              fill="#10b981" 
              fillOpacity={0.1} 
              name="Upper Confidence Bound"
            />
            <Area 
              type="monotone" 
              dataKey="predictedMin" 
              stroke="none" 
              fill="#1e293b" 
              fillOpacity={0.8} 
            />
            <Area 
              type="monotone" 
              dataKey="predictedRevenue" 
              name="Predicted Revenue"
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorPredicted)" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-400" />
            Weather & Seasonality Impact
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium">Summer Peak Effect</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">+24%</div>
              <p className="text-xs text-green-600 mt-1">Expected volume increase</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CloudRain className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium">Rain Risk (Days 45-60)</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">-12%</div>
              <p className="text-xs text-red-500 mt-1">Potential volume drop</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            AI Staffing Recommendations
          </h3>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {STAFFING_RECS.map((rec, idx) => (
              <div 
                key={rec.week}
                className={twMerge(
                  clsx(
                    "p-3 flex items-center justify-between",
                    idx !== STAFFING_RECS.length - 1 && "border-b border-slate-200 dark:border-slate-700"
                  )
                )}
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-white text-sm">{rec.week}</div>
                  <div className="text-xs text-slate-500">{rec.reason}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{rec.staff} Photogs</div>
                  <div className={twMerge(
                    clsx(
                      "px-2 py-1 rounded text-xs font-medium",
                      rec.trend === 'up' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      rec.trend === 'down' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    )
                  )}>
                    {rec.trend === 'up' ? '+ Increase' : rec.trend === 'down' ? '- Decrease' : 'Maintain'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDemandForecasting;
