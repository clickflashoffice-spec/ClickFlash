/**
 * Dashboard Toolbar — quick-action bar for common operations.
 * Renders as a horizontal row of icon+label buttons at the top of the dashboard.
 */
import React, { memo } from 'react';
import { View } from '../../types';

interface ToolbarAction {
  label: string;
  view: View;
  icon: React.ReactNode;
  color: string;
}

interface ToolbarProps {
  onNavigate: (view: View) => void;
}

const FolderIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ACTIONS: ToolbarAction[] = [
  { label: 'New Album',   view: 'Albums',    icon: <FolderIcon />,   color: 'cyan' },
  { label: 'New Order',   view: 'Orders',    icon: <ShoppingBagIcon />, color: 'violet' },
  { label: 'New Booking', view: 'Bookings',  icon: <CalendarIcon />, color: 'emerald' },
  { label: 'Analytics',   view: 'Analytics', icon: <AnalyticsIcon />, color: 'amber' },
];

const colorMap: Record<string, string> = {
  cyan:    'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/40',
  violet:  'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
  amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40',
};

const Toolbar: React.FC<ToolbarProps> = memo(({ onNavigate }) => (
  <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    {ACTIONS.map(action => (
      <button
        key={action.view}
        onClick={() => onNavigate(action.view)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold
          transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
          focus:ring-cyan-500 active:scale-95
          ${colorMap[action.color]}
        `}
        aria-label={action.label}
      >
        {action.icon}
        <span>{action.label}</span>
      </button>
    ))}

    <button
      onClick={() => onNavigate('Settings')}
      className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400 active:scale-95"
      aria-label="Settings"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span>Settings</span>
    </button>
  </div>
));

Toolbar.displayName = 'Toolbar';
export default Toolbar;
