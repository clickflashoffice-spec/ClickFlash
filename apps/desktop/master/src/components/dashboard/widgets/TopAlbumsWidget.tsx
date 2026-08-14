import { Card } from "@clickflash/ui";
import React, { useMemo } from 'react';

import { Order, Album } from '../../../types';
import { useCurrency } from '../../CurrencyContext';
import { TrendingUp } from 'lucide-react';

interface TopAlbumsWidgetProps {
    orders: Order[];
    albums: Album[];
}

const TopAlbumsWidget: React.FC<TopAlbumsWidgetProps> = ({ orders, albums }) => {
    const { formatCurrency } = useCurrency();

    const topAlbums = useMemo(() => {
        const albumStats = new Map<string, { name: string, revenue: number }>();

        orders.forEach(order => {
            if (order.status === 'Completed' && order.albumId) {
                const albumId = order.albumId;
                const current = albumStats.get(albumId) || {
                    name: albums.find(a => a.id === albumId)?.title || 'Unknown Album',
                    revenue: 0
                };
                albumStats.set(albumId, {
                    ...current,
                    revenue: current.revenue + order.total
                });
            }
        });

        return Array.from(albumStats.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);
    }, [orders, albums]);

    if (topAlbums.length === 0) {
        return (
            <Card>
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h4 className="text-sm sm:text-base font-bold dark:text-white">Top Performing Albums</h4>
                    <span className="text-[10px] text-slate-500 font-medium">By Local Revenue</span>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">No album sales data</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-bold dark:text-white">Top Performing Albums</h4>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Top 3 Rankings</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {topAlbums.map((album, i) => (
                    <div key={i} className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 group hover:border-blue-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${i === 0 ? 'bg-yellow-500 text-yellow-950' : i === 1 ? 'bg-slate-400 text-slate-900' : 'bg-orange-600 text-orange-50'} shadow-sm`}>
                                Rank #{i + 1}
                            </span>
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <h5 className="font-bold text-slate-900 dark:text-white truncate text-xs sm:text-sm mb-2">{album.name}</h5>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter opacity-70">Total Revenue</p>
                                <p className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">{formatCurrency(album.revenue)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter opacity-70">Client Interest</p>
                                <p className="text-[10px] sm:text-xs font-bold text-emerald-500">High</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default TopAlbumsWidget;
