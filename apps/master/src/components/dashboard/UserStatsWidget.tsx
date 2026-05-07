/**
 * UserStatsWidget — shows per-photographer activity stats for the current period.
 * Counts albums processed and orders fulfilled per photographer.
 */
import React, { memo, useMemo } from 'react';
import Card from '../common/Card';
import { Order, Photographer, Album } from '../../types';

interface UserStatsWidgetProps {
  photographers: Photographer[];
  orders: Order[];
  albums: Album[];
}

interface PhotographerStat {
  id: string | number;
  name: string;
  albumCount: number;
  orderCount: number;
  revenue: number;
}

function buildStats(
  photographers: Photographer[],
  orders: Order[],
  albums: Album[],
): PhotographerStat[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Recent orders
  const recentOrders = orders.filter(o => {
    const d = new Date(o.date || '');
    return !isNaN(d.getTime()) && d >= weekAgo;
  });

  return photographers
    .map(p => {
      const pid = String(p.id);
      const albumCount = albums.filter(a => String(a.photographerId) === pid).length;
      const myOrders = recentOrders.filter(o => String(o.photographerId) === pid);
      const revenue = myOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
      return { id: p.id, name: p.name || 'Unknown', albumCount, orderCount: myOrders.length, revenue };
    })
    .filter(s => s.albumCount > 0 || s.orderCount > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
}

const UserStatsWidget: React.FC<UserStatsWidgetProps> = memo(({ photographers, orders, albums }) => {
  const stats = useMemo(() => buildStats(photographers, orders, albums), [photographers, orders, albums]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Photographer Activity
        </h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">This week</span>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
          No activity this week
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map((s, i) => (
            <div key={String(s.id)} className="flex items-center gap-3">
              {/* Rank badge */}
              <div className={`
                flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-black
                ${i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : i === 1 ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  : i === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}
              `}>
                {i + 1}
              </div>

              {/* Name + bars */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {s.name}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                    {s.albumCount}a · {s.orderCount}o
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full"
                    style={{ width: `${Math.min(100, (s.albumCount / (Math.max(...stats.map(x => x.albumCount), 1))) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

UserStatsWidget.displayName = 'UserStatsWidget';
export default UserStatsWidget;
