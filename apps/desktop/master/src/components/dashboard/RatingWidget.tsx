import { Card } from "@clickflash/ui";
/**
 * RatingWidget — derives a customer satisfaction score from order data.
 * Completed orders → positive, Cancelled orders → negative.
 * Wires into Dashboard via props passed from the parent query.
 */
import React, { memo, useMemo } from 'react';

import { Order } from '../../types';

interface RatingWidgetProps {
  orders: Order[];
}

function calcSatisfaction(orders: Order[]): {
  score: number;
  completed: number;
  cancelled: number;
  total: number;
  label: string;
  color: string;
} {
  const completed = orders.filter(o => o.status === 'Completed').length;
  const cancelled = orders.filter(o => o.status === 'Cancelled').length;
  const total = orders.length;

  if (total === 0) {
    return { score: 0, completed: 0, cancelled: 0, total: 0, label: 'No data', color: 'slate' };
  }

  const score = Math.round((completed / total) * 100);

  let label = 'Excellent';
  let color = 'emerald';
  if (score < 50)  { label = 'Needs Attention'; color = 'red'; }
  else if (score < 70) { label = 'Fair';      color = 'amber'; }
  else if (score < 85) { label = 'Good';      color = 'blue'; }

  return { score, completed, cancelled, total, label, color };
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    className={`h-4 w-4 ${filled ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const RatingWidget: React.FC<RatingWidgetProps> = memo(({ orders }) => {
  const stats = useMemo(() => calcSatisfaction(orders), [orders]);
  const stars = Math.round((stats.score / 100) * 5);

  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue:    'text-blue-600 dark:text-blue-400',
    amber:   'text-amber-600 dark:text-amber-400',
    red:     'text-red-600 dark:text-red-400',
    slate:   'text-slate-500 dark:text-slate-400',
  };
  const bgMap: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    blue:    'bg-blue-50 dark:bg-blue-900/20',
    amber:   'bg-amber-50 dark:bg-amber-900/20',
    red:     'bg-red-50 dark:bg-red-900/20',
    slate:   'bg-slate-50 dark:bg-slate-800',
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Customer Satisfaction
        </h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bgMap[stats.color]} ${colorMap[stats.color]}`}>
          {stats.label}
        </span>
      </div>

      {stats.total === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500">
          No order data yet
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                  className="text-slate-100 dark:text-slate-700" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                  className={colorMap[stats.color]} strokeWidth="3"
                  strokeDasharray={`${(stats.score / 100) * 87.96} 87.96`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-lg font-black ${colorMap[stats.color]}`}>
                {stats.score}%
              </span>
            </div>

            <div className="flex-1">
              <div className="flex gap-0.5 mb-2" aria-label={`${stars} out of 5 stars`}>
                {[1,2,3,4,5].map(s => (
                  <StarIcon key={s} filled={s <= stars} />
                ))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Based on {stats.total} order{stats.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="text-center">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Completed
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-red-500 dark:text-red-400">
                {stats.cancelled}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Cancelled
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
});

RatingWidget.displayName = 'RatingWidget';
export default RatingWidget;
