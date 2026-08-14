import React from 'react';
import { AlertTriangle, AlertCircle, TrendingDown, Clock, ShieldAlert, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ChurnRisk {
  id: string;
  resortName: string;
  riskScore: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  lastActive: string;
  trend: string;
  aiReason: string;
  suggestedAction: string;
}

const CHURN_DATA: ChurnRisk[] = [
  {
    id: '1',
    resortName: 'Oceanview Paradise Resort',
    riskScore: 88,
    riskLevel: 'High',
    lastActive: '2 hours ago',
    trend: '-42%',
    aiReason: 'Upload volume dropped 40% in last 14 days. Staff activity down significantly.',
    suggestedAction: 'Dispatch Success Manager',
  },
  {
    id: '2',
    resortName: 'Mountain Peak Lodge',
    riskScore: 75,
    riskLevel: 'High',
    lastActive: '48 hours ago',
    trend: '-20%',
    aiReason: 'Main lobby kiosk offline for 48h. Zero uploads in last 3 days.',
    suggestedAction: 'Send Platform Health Audit',
  },
  {
    id: '3',
    resortName: 'Sunset Valley Hotel',
    riskScore: 45,
    riskLevel: 'Medium',
    lastActive: '1 day ago',
    trend: '-5%',
    aiReason: 'Slight decrease in customer email captures compared to historical baseline.',
    suggestedAction: 'Automated Check-in Email',
  },
];

export const PredictiveChurnAlert: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-red-50/50 dark:bg-red-900/10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              Predictive Churn Alerts
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              AI-identified resort partners at risk of churn based on engagement and volume anomalies.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1.5 rounded-full text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            2 High Risk Partners
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 font-medium">Resort Partner</th>
              <th className="px-6 py-4 font-medium">Risk Level</th>
              <th className="px-6 py-4 font-medium">Activity & Trend</th>
              <th className="px-6 py-4 font-medium">AI Risk Reason</th>
              <th className="px-6 py-4 font-medium">Retention Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {CHURN_DATA.map((risk) => (
              <tr key={risk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-white">{risk.resortName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Score: {risk.riskScore}/100</div>
                </td>
                <td className="px-6 py-4">
                  <span className={twMerge(
                    clsx(
                      "px-2.5 py-1 rounded-full text-xs font-medium border",
                      risk.riskLevel === 'High' 
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30"
                        : risk.riskLevel === 'Medium'
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
                        : "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30"
                    )
                  )}>
                    {risk.riskLevel} Risk
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">{risk.lastActive}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Vol {risk.trend}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-start gap-2 max-w-xs">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                      {risk.aiReason}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                    {risk.suggestedAction}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictiveChurnAlert;
