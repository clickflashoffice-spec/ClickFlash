import React from 'react';
import Card from '../../common/Card';

/**
 * StatCard Component
 */
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = React.memo(({ title, value, icon }) => (
    <Card className="flex items-start space-x-2.5 sm:space-x-3">
        <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'h-4 w-4 sm:h-5 sm:w-5' }) : icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium sm:font-semibold mb-0.5 sm:mb-1 uppercase tracking-wide">{title}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{value}</p>
        </div>
    </Card>
));

StatCard.displayName = 'StatCard';

export default StatCard;
