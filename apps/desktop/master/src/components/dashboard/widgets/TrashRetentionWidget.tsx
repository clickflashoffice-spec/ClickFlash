import React, { useMemo } from 'react';
import { SystemHealthStats, View } from '../../../types';
import { motion } from 'framer-motion';
import { useCurrency } from '../../CurrencyContext';

interface TrashRetentionWidgetProps {
    stats: SystemHealthStats | null;
    onChangeView: (view: View) => void;
}

export const TrashRetentionWidget: React.FC<TrashRetentionWidgetProps> = ({ stats, onChangeView }) => {
    const { formatCurrency } = useCurrency();

    const retentionValue = useMemo(() => {
        if (!stats || !stats.queues) return 0;
        const price = parseFloat(stats.price || '0');
        return stats.queues.retention * price;
    }, [stats]);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChangeView('Growth')}
            className="glass-card p-4 rounded-xl hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden ring-1 ring-amber-400/20 hover:ring-amber-400/50"
        >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none transition-colors duration-500 group-hover:from-amber-500/10" />

            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7.994 7.994 0 01-5 7.425M5.998 12A8.003 8.003 0 0012 19.5" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Money Trash</p>
                        <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 font-heading">
                            {formatCurrency(retentionValue)}
                        </h3>
                    </div>
                </div>

                <div className="p-1 rounded-full text-slate-400 group-hover:text-amber-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>

            <div className="mt-3 relative z-10">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Recoverable Assets:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                        {stats?.queues?.retention || 0} Photos
                    </span>
                </div>

                <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-semibold">
                        <span>Retention Period</span>
                        <span>{stats?.retentionDays || 7} Days</span>
                    </div>
                    {/* Visual Retention Indicator */}
                    <div className="flex space-x-0.5">
                        {[...Array(7)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full ${i < (stats?.retentionDays || 7) ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
