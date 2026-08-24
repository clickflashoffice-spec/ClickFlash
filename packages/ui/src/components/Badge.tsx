import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'cyber' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
  warning: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
  danger: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
  info: 'bg-blue-950/70 text-blue-300 border-blue-800/60',
  cyber: 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60 shadow-sm shadow-indigo-500/20',
  glass: 'bg-slate-900/60 backdrop-blur-md text-slate-200 border-slate-700/50 shadow-inner',
};

const dotColors: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-blue-400',
  cyber: 'bg-indigo-400',
  glass: 'bg-cyan-400',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
