import React, { useMemo } from 'react';
import Card from '../../common/Card.tsx';
import { Order, Photographer } from '../../../types.ts';
import { useCurrency } from '../../CurrencyContext.tsx';

interface TopPhotographersWidgetProps {
  orders: Order[];
  photographers: Photographer[];
}

const TopPhotographersWidget: React.FC<TopPhotographersWidgetProps> = ({ orders, photographers }) => {
  const { formatCurrency } = useCurrency();

  const photographerSales = useMemo(() => {
    const salesMap = new Map<number, number>();
    orders.forEach(order => {
      if (order.status === 'Completed') {
        salesMap.set(order.photographerId, (salesMap.get(order.photographerId) || 0) + order.total);
      }
    });

    return photographers
      .map(p => ({
        ...p,
        totalSales: salesMap.get(p.id) || 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);
  }, [orders, photographers]);

  if (photographerSales.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-bold mb-4">Top Photographers</h3>
        <div className="text-center py-8">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No sales data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-bold mb-4">Top Photographers</h3>
      <div className="space-y-4">
        {photographerSales.map((p, index) => (
          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <img 
                  src={p.avatarUrl || 'https://i.imgur.com/3Y2j2s2.png'} 
                  alt={p.name} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://i.imgur.com/3Y2j2s2.png';
                  }}
                />
                {index === 0 && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-900" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.specialty || 'Photographer'}</p>
              </div>
            </div>
            <p className="font-semibold font-mono text-sm text-green-600 dark:text-green-400 ml-2">{formatCurrency(p.totalSales)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TopPhotographersWidget;