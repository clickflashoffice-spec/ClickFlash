import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'glass' | 'cyber' | 'accent';
  className?: string;
}

const variantStyles: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'bg-slate-900 border-slate-800 text-slate-100',
  glass: 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-lg shadow-black/20 text-slate-100',
  cyber: 'bg-gradient-to-b from-slate-900/90 to-indigo-950/40 border-indigo-800/40 shadow-lg shadow-indigo-500/10 text-white',
  accent: 'bg-gradient-to-b from-slate-900/90 to-blue-950/40 border-blue-800/40 shadow-lg shadow-blue-500/10 text-white',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon: Icon,
  trend,
  variant = 'glass',
  className = '',
}) => {
  const computedTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : undefined);

  return (
    <div className={`p-5 rounded-2xl border transition-all hover:border-slate-700/80 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-800/80 text-blue-400 border border-slate-700/50">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              computedTrend === 'up'
                ? 'text-emerald-400'
                : computedTrend === 'down'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {change > 0 ? `+${change}%` : `${change}%`}
          </span>
          <span className="text-slate-500 text-[11px]">{changeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
