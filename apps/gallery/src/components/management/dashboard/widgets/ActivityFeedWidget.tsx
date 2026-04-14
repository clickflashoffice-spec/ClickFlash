import React, { useMemo } from 'react';
import Card from '../../../common/Card';
import { Order, Expense, Adjustment, Photographer, ActivityItem } from '../../../../types';
import { useCurrency } from '../../../CurrencyContext';

interface ActivityFeedWidgetProps {
  orders: Order[];
  expenses: Expense[];
  adjustments: Adjustment[];
  photographers: Photographer[];
}

const ActivityIcon: React.FC<{ type: ActivityItem['type'] }> = ({ type }) => {
    const icons = {
        order: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>,
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-600 dark:text-green-400',
            ring: 'ring-green-100 dark:ring-green-900/20'
        },
        expense: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h12v4a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2H4z" clipRule="evenodd" /></svg>,
            bg: 'bg-red-100 dark:bg-red-900/30',
            text: 'text-red-600 dark:text-red-400',
            ring: 'ring-red-100 dark:ring-red-900/20'
        },
        adjustment: {
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a3 3 0 015.242-2.121.5.5 0 01.516 0A3 3 0 0115 5v2a3 3 0 01-3 3H8a3 3 0 01-3-3V5zm5 7a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm-3 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v1a1 1 0 102 0v-1a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            text: 'text-blue-600 dark:text-blue-400',
            ring: 'ring-blue-100 dark:ring-blue-900/20'
        }
    };
    
    const style = icons[type];
    
    return (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.bg} ${style.text} ring-4 ${style.ring}`}>
            {style.icon}
        </div>
    );
};

const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({ orders, expenses, adjustments, photographers }) => {
    const { formatCurrency } = useCurrency();

    const feedItems = useMemo(() => {
        const orderItems: ActivityItem[] = orders.map(o => ({
            id: `o-${o.id}`,
            type: 'order',
            date: o.date,
            description: `Order #${o.id} placed by ${o.clientName}`,
            amount: o.total,
            context: o.status
        }));

        const expenseItems: ActivityItem[] = expenses.map(e => ({
            id: `e-${e.id}`,
            type: 'expense',
            date: e.date,
            description: e.description,
            amount: e.cost,
            context: e.category
        }));

        const adjustmentItems: ActivityItem[] = adjustments.map(adj => ({
            id: `adj-${adj.id}`,
            type: 'adjustment',
            date: adj.date,
            description: `${adj.type}: ${adj.description}`,
            amount: adj.amount,
            context: photographers.find(p => p.id === String(adj.photographerId))?.name || 'Staff'
        }));

        return [...orderItems, ...expenseItems, ...adjustmentItems]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 7);
    }, [orders, expenses, adjustments, photographers]);

    const getAmountDisplay = (item: ActivityItem) => {
        if (item.type === 'order') return `+${formatCurrency(item.amount)}`;
        if (item.type === 'expense') return `-${formatCurrency(item.amount)}`;
        if (item.type === 'adjustment') {
            const adj = adjustments.find(a => `adj-${a.id}` === item.id);
            if (adj?.type === 'Bonus') return `+${formatCurrency(item.amount)}`;
            if (adj?.type === 'Deduction') return `-${formatCurrency(item.amount)}`;
        }
        return formatCurrency(item.amount);
    };

    const getAmountColor = (item: ActivityItem) => {
         if (item.type === 'order') return 'text-green-600 dark:text-green-400';
         if (item.type === 'expense') return 'text-red-600 dark:text-red-400';
         if (item.type === 'adjustment') {
            const adj = adjustments.find(a => `adj-${a.id}` === item.id);
            if (adj?.type === 'Bonus') return 'text-green-600 dark:text-green-400';
            if (adj?.type === 'Deduction') return 'text-red-600 dark:text-red-400';
         }
         return 'text-slate-800 dark:text-slate-200';
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                    {feedItems.length} New
                </span>
            </div>
            
            <div className="space-y-0 relative flex-grow">
                {/* Vertical Line */}
                <div className="absolute left-4 top-2 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                {feedItems.map((item) => (
                    <div key={item.id} className="relative pl-12 py-3 group first:pt-0">
                        <div className="absolute left-0 top-3 bg-white dark:bg-slate-800 z-10">
                            <ActivityIcon type={item.type} />
                        </div>
                        
                        <div className="flex justify-between items-start">
                            <div className="pr-4">
                                <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {item.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-1.5 rounded">
                                        {item.context}
                                    </span>
                                    <span className="text-xs text-slate-400">•</span>
                                    <span className="text-xs text-slate-500">{formatTimeAgo(item.date)}</span>
                                </div>
                            </div>
                            <div className={`text-sm font-bold font-mono whitespace-nowrap ${getAmountColor(item)}`}>
                                {getAmountDisplay(item)}
                            </div>
                        </div>
                    </div>
                ))}
                
                {feedItems.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic text-sm">No recent activity recorded.</div>
                )}
            </div>
        </Card>
    );
};

export default ActivityFeedWidget;