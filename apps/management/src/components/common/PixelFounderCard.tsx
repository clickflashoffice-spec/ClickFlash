import React from "react";

interface PixelFounderCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "dark" | "light";
  action?: React.ReactNode;
}

export const PixelFounderCard: React.FC<PixelFounderCardProps> = ({
  title,
  subtitle,
  children,
  className = "",
  variant = "dark",
  action
}) => {
  const cardClass = variant === "dark" ? "pixel-card" : "pixel-card-light";
  
  return (
    <div className={`${cardClass} ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && (
              <h3 className={`text-sm font-black uppercase tracking-widest ${variant === "dark" ? "text-[#94a3b8]" : "text-slate-500"}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-2xl font-serif font-black ${variant === "dark" ? "text-white" : "text-slate-900"} mt-1`}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

interface PixelFounderStatCardProps {
  label: string;
  value: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  goalProgress?: number; // 0 to 100
  className?: string;
}

export const PixelFounderStatCard: React.FC<PixelFounderStatCardProps> = ({
  label,
  value,
  trend,
  goalProgress,
  className = ""
}) => {
  return (
    <PixelFounderCard className={className}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">
          {label}
        </span>
        {trend && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${trend.isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      
      <div className="text-3xl font-serif font-bold text-white mb-6">
        {value}
      </div>

      {goalProgress !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
            <span className="text-[#38bdf8]">Current Performance</span>
            <span className="text-[#94a3b8]">Target: 100%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.5)] transition-all duration-1000 w-[${goalProgress}%]`}
            />
          </div>
        </div>
      )}
    </PixelFounderCard>
  );
};
