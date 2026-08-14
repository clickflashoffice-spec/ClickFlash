import { Card } from "@clickflash/ui";
import React from 'react';

import { Order, Photographer, Album } from '../../../types.ts';
import { useCurrency } from '../../CurrencyContext.tsx';

interface StatsWidgetProps {
  orders: Order[];
  photographers: Photographer[];
  albums: Album[];
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon }) => (
    <Card className="flex items-center space-x-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
));

const StatsWidget: React.FC<StatsWidgetProps> = React.memo(({ orders, albums }) => {
    const { formatCurrency } = useCurrency();
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySales = orders
        .filter(o => o.status === 'Completed' && new Date(o.date) >= firstDayOfMonth)
        .reduce((sum, o) => sum + o.total, 0);

    const pendingOrders = orders.filter(o => o.status === 'Pending').length;

    const todayString = new Date().toISOString().split('T')[0];
    const newAlbumsToday = albums.filter(album => album.date === todayString).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
                title="This Month's Sales" 
                value={formatCurrency(monthlySales)}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
            />
             <StatCard 
                title="Albums Today" 
                value={newAlbumsToday.toString()}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <StatCard 
                title="Pending Orders" 
                value={pendingOrders.toString()}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
        </div>
    );
});

StatsWidget.displayName = 'StatsWidget';

export default StatsWidget;