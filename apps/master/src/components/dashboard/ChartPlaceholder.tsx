/**
 * ChartPlaceholder — a lightweight SVG sparkline showing order volume trend.
 * Uses local order data — no additional API call required.
 * Distinct from SalesChartWidget (ApexCharts full chart); this is a compact
 * inline sparkline suitable for tight dashboard grids.
 */
import React, { memo, useMemo } from 'react';
import Card from '../common/Card';
import { Order } from '../../types';

interface ChartPlaceholderProps {
  orders: Order[];
  /** Number of days to show. Defaults to 7. */
  days?: number;
}

function buildSparkData(orders: Order[], days: number): { date: string; count: number; revenue: number }[] {
  const result: { date: string; count: number; revenue: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);

    const dayOrders = orders.filter(o => {
      if (!o.date) return false;
      return o.date.slice(0, 10) === key;
    });

    result.push({
      date: key,
      count: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    });
  }
  return result;
}

function polyline(points: number[], width: number, height: number, padding: number): string {
  if (points.length < 2) return '';
  const max = Math.max(...points, 1);
  const xs = points.map((_, i) => padding + (i / (points.length - 1)) * (width - padding * 2));
  const ys = points.map(v => height - padding - ((v / max) * (height - padding * 2)));
  return xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
}

const DAYS_SHORT = ['S','M','T','W','T','F','S'];

const ChartPlaceholder: React.FC<ChartPlaceholderProps> = memo(({ orders, days = 7 }) => {
  const data = useMemo(() => buildSparkData(orders, days), [orders, days]);

  const counts = data.map(d => d.count);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...counts, 1);

  const W = 280;
  const H = 64;
  const PAD = 8;
  const pts = polyline(counts, W, H, PAD);

  // Build filled area path
  const xs = counts.map((_, i) => PAD + (i / (counts.length - 1)) * (W - PAD * 2));
  const ys = counts.map(v => H - PAD - ((v / maxCount) * (H - PAD * 2)));
  const areaPath = xs.length >= 2
    ? `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)} ` +
      xs.slice(1).map((x, i) => `L ${x.toFixed(1)},${ys[i+1].toFixed(1)}`).join(' ') +
      ` L ${xs[xs.length-1].toFixed(1)},${H - PAD} L ${xs[0].toFixed(1)},${H - PAD} Z`
    : '';

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Order Volume
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">Last {days} days</span>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 mb-3">
        <div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100">{totalOrders}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">Orders</div>
        </div>
        <div>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400">
            €{totalRevenue.toFixed(0)}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">Revenue</div>
        </div>
      </div>

      {/* Sparkline */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        aria-label={`Order volume over last ${days} days`}
        role="img"
      >
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {areaPath && (
          <path d={areaPath} fill="url(#sparkGrad)" />
        )}

        {pts && (
          <polyline
            points={pts}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots on each data point */}
        {xs.map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={ys[i]}
            r={counts[i] > 0 ? 3 : 1.5}
            fill={counts[i] > 0 ? '#06b6d4' : '#cbd5e1'}
            stroke="white"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Day labels */}
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => {
          const dayIdx = new Date(d.date).getDay();
          return (
            <span key={i} className="text-[9px] text-slate-400 dark:text-slate-500 text-center w-6">
              {DAYS_SHORT[dayIdx]}
            </span>
          );
        })}
      </div>
    </Card>
  );
});

ChartPlaceholder.displayName = 'ChartPlaceholder';
export default ChartPlaceholder;
