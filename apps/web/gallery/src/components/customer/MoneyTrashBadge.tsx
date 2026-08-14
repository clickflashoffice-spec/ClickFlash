import React from 'react';

interface MoneyTrashBadgeProps {
  discountPercentage: number;
  daysUntilDeletion: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'overlay' | 'inline';
}

const MoneyTrashBadge: React.FC<MoneyTrashBadgeProps> = ({
  discountPercentage,
  daysUntilDeletion,
  size = 'md',
  variant = 'overlay'
}) => {
  const sizeClasses = {
    sm: { container: 'px-2 py-1 text-[9px]', icon: 'w-3 h-3', gap: 'gap-1' },
    md: { container: 'px-3 py-1.5 text-[10px]', icon: 'w-4 h-4', gap: 'gap-1.5' },
    lg: { container: 'px-4 py-2 text-xs', icon: 'w-5 h-5', gap: 'gap-2' }
  };

  const getUrgencyStyles = (days: number): string => {
    if (days <= 1) return 'bg-red-500 text-white border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
    if (days <= 3) return 'bg-orange-500 text-white border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
    if (days <= 7) return 'bg-amber-500 text-white border-amber-400/50';
    return 'bg-emerald-500 text-white border-emerald-400/50';
  };

  const shouldPulse = daysUntilDeletion <= 3;

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center ${sizeClasses[size].gap} ${sizeClasses[size].container} rounded-full font-black uppercase tracking-widest border ${getUrgencyStyles(daysUntilDeletion)} ${shouldPulse ? 'animate-pulse' : ''} glass-panel`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses[size].icon} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
        <span>{discountPercentage}% OFF</span>
        <span className="opacity-30 mx-1">/</span>
        <span className="italic">{daysUntilDeletion}D Remaining</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 animate-fade-in-down">
      <div className={`flex items-center ${sizeClasses[size].gap} ${sizeClasses[size].container} rounded-xl font-black uppercase tracking-widest bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-xl border border-white/20 ${shouldPulse ? 'animate-pulse' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses[size].icon} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
        <span className="drop-shadow-sm">{discountPercentage}% OFF</span>
      </div>

      <div className={`flex items-center ${sizeClasses[size].gap} ${sizeClasses[size].container} rounded-xl font-black uppercase tracking-widest ${getUrgencyStyles(daysUntilDeletion)} glass-panel border border-white/10 backdrop-blur-md`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses[size].icon} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span className="italic">
          {daysUntilDeletion === 0 ? 'Expiring Now' : daysUntilDeletion === 1 ? 'Last 24h' : `${daysUntilDeletion} Days Left`}
        </span>
      </div>
    </div>
  );
};

export const MoneyTrashMiniBadge: React.FC<{ discountPercentage: number }> = ({ discountPercentage }) => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-inner">
    {discountPercentage}% OFF
  </span>
);

export const MoneyTrashWarningBanner: React.FC<{ daysUntilDeletion: number; photoCount: number }> = ({
  daysUntilDeletion,
  photoCount
}) => {
  const getUrgencyStyles = (days: number) => {
    if (days <= 1) return 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]';
    if (days <= 3) return 'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]';
    return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  };

  return (
    <div className={`premium-card p-6 border ${getUrgencyStyles(daysUntilDeletion)} flex items-center gap-6 group hover:border-white/20 transition-all`}>
      <div className="flex-shrink-0 relative">
        <div className="absolute inset-0 bg-current blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 relative z-10" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="font-black text-xl text-white uppercase italic tracking-tighter decoration-current underline lg:no-underline">
          {daysUntilDeletion <= 1 ? 'Emergency Archive Warning' : 'Limited Event Exposure'}
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-400 leading-relaxed max-w-2xl">
          {photoCount} high-end assets are marked for permanent deletion.
          {daysUntilDeletion === 0 ? ' CRITICAL: Final 24 hours before loss of archive access.' : ` NOTICE: Transition to legacy storage in ${daysUntilDeletion} days.`}
        </p>
      </div>
      <div className="flex-shrink-0 text-right pr-2">
        <div className="text-4xl font-black text-white italic tracking-tighter leading-none">{daysUntilDeletion}</div>
        <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-cyan-400 mt-1">Days Left</div>
      </div>
    </div>
  );
};

export default MoneyTrashBadge;
