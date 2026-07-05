import React from "react";
import { motion } from "framer-motion";

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = React.memo(
  ({ title, value, icon, className = "", onClick, isLoading }) => {
    if (isLoading) {
      return <StatCardSkeleton />;
    }

    return (
      <motion.div
        variants={{
          hidden: { opacity: 0, scale: 0.95, y: 20 },
          show: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 100 },
          },
        }}
        whileHover={{
          scale: 1.04,
          y: -6,
          boxShadow: "0 25px 50px -12px rgba(31, 38, 135, 0.15)",
        }}
        whileTap={{ scale: 0.98 }}
        className={`group relative glass-card p-4 sm:p-5 flex items-start space-x-3 sm:space-x-4 overflow-visible transition-all duration-300 ${onClick ? "cursor-pointer border-blue-200/40 dark:border-blue-700/40" : ""} ${className}`}
        onClick={onClick}
        {...(onClick ? { role: "button" } : {})}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        {/* Subtle internal shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none rounded-2xl" />

        <div className="relative p-2.5 sm:p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 shrink-0 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, {
                className: "h-5 w-5 sm:h-6 sm:w-6",
              })
            : icon}
        </div>
        <div className="relative flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mb-1 sm:mb-1.5 uppercase tracking-[0.1em] opacity-70">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-850 dark:text-white leading-tight tracking-tight font-heading">
            {value}
          </p>
        </div>
      </motion.div>
    );
  }
);

StatCard.displayName = "StatCard";

export const StatCardSkeleton: React.FC = React.memo(() => (
  <div className="glass-card p-3 sm:p-4 animate-pulse">
    <div className="flex items-start space-x-2.5 sm:space-x-3">
      <div className="p-2 sm:p-2.5 rounded-lg bg-slate-200/50 dark:bg-slate-700/50 shrink-0">
        <div className="h-4 w-4 sm:h-5 sm:w-5 bg-slate-300/50 dark:bg-slate-600/50 rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="h-3 sm:h-4 w-20 sm:w-24 bg-slate-200/50 dark:bg-slate-700/50 rounded mb-2" />
        <div className="h-6 sm:h-8 w-16 sm:w-20 bg-slate-200/50 dark:bg-slate-700/50 rounded" />
      </div>
    </div>
  </div>
));

StatCardSkeleton.displayName = "StatCardSkeleton";

export const DashboardViewportSkeleton: React.FC = React.memo(() => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
    </div>
  </div>
));

DashboardViewportSkeleton.displayName = "DashboardViewportSkeleton";
