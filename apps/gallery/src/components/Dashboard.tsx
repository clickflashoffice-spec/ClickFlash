
import React, { useState, useMemo, useEffect } from 'react';
import { Order, Photographer, Album, View } from '../types.ts';
import { useCurrency } from './CurrencyContext';
import RecentOrdersWidget from './dashboard/widgets/RecentOrdersWidget';
import TopPhotographersWidget from './dashboard/widgets/TopPhotographersWidget';
import DailyObjectivesWidget from './dashboard/widgets/DailyObjectivesWidget';
import SalesChartWidget from './dashboard/widgets/SalesChartWidget';
import AlbumsToProcessWidget from './dashboard/widgets/AlbumsToProcessWidget';
import Card from './common/Card';

interface DashboardProps {
    localData: {
        orders: Order[];
        photographers: Photographer[];
        albums: Album[];
    };
    currentUser: Photographer;
    onNavigate: (view: View) => void;
}

type TimeFilter = 'Today' | '7D' | '30D';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon, className = '', onClick }) => (
    <div 
        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-start space-x-4 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 active:scale-[0.98]' : ''} ${className}`}
        onClick={onClick}
    >
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
        </div>
    </div>
));

/**
 * Dashboard Component
 * 
 * Main dashboard view showing key metrics and widgets for the Master Portal.
 * 
 * Features:
 * - Real-time statistics (total revenue, orders, photos, albums)
 * - Time-based filtering (Today, 7 Days, 30 Days)
 * - System health indicator
 * - Recent orders widget
 * - Top photographers widget
 * - Daily objectives widget
 * - Sales chart widget
 * - Albums to process widget
 * 
 * @param {DashboardProps} props - Component props
 */
const Dashboard: React.FC<DashboardProps> = ({ localData, currentUser, onNavigate }) => {
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('7D');
    const { formatCurrency } = useCurrency();
    const [systemHealth, setSystemHealth] = useState<{status: 'Optimal' | 'Check Needed', lastScan: string | null}>({ status: 'Check Needed', lastScan: null });
    
    // Ensure we have data
    const safeData = {
        orders: localData?.orders || [],
        photographers: localData?.photographers || [],
        albums: localData?.albums || []
    };

    useEffect(() => {
        const checkHealth = () => {
            const lastScan = localStorage.getItem('lastDeepScan');
            if (!lastScan) {
                setSystemHealth({ status: 'Check Needed', lastScan: null });
                return;
            }
            const diff = new Date().getTime() - new Date(lastScan).getTime();
            const hours = diff / (1000 * 3600);
            if (hours > 24) {
                setSystemHealth({ status: 'Check Needed', lastScan });
            } else {
                setSystemHealth({ status: 'Optimal', lastScan });
            }
        };
        checkHealth();
        // Listen for storage events to update if settings changed in another tab or via internal event
        window.addEventListener('storage', checkHealth);
        return () => window.removeEventListener('storage', checkHealth);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const todayString = new Date().toISOString().split('T')[0];
    const dateDisplay = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    
    const kpiData = useMemo(() => {
        const todaysOrders = safeData.orders.filter(o => o.date === todayString && o.status === 'Completed');
        const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.total, 0);

        const todaysAlbums = safeData.albums.filter(album => album.date === todayString);
        const todaysPhotos = todaysAlbums.reduce((sum, a) => sum + (a.photos?.length || 0), 0);

        // Albums that are not finalized yet (Drafts)
        const albumsToProcess = safeData.albums.filter(a => a.status !== 'Finalized' && a.status !== 'Archived').length;
        
        return { 
            todaysRevenue, 
            todaysPhotos, 
            albumsToProcess, 
            pendingOrders: safeData.orders.filter(o => o.status === 'Pending').length,
        };
    }, [safeData.orders, safeData.albums, todayString]);

    const filteredOrders = useMemo(() => {
        const now = new Date();
        let startDate = new Date();

        switch (timeFilter) {
            case 'Today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case '7D':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30D':
                startDate.setDate(now.getDate() - 30);
                break;
        }

        return safeData.orders.filter(o => new Date(o.date) >= startDate);
    }, [safeData.orders, timeFilter]);

    const filterOptions: { id: TimeFilter, label: string }[] = [
        { id: 'Today', label: 'Today' },
        { id: '7D', label: '7 Days' },
        { id: '30D', label: '30 Days' },
    ];

    return (
        <div className="space-y-6 animate-fadeIn pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{currentUser.name.split(' ')[0]}</span>
                        </h1>
                        <button 
                            onClick={() => onNavigate('Settings')}
                            className={`hidden md:flex items-center border px-2 py-0.5 rounded-full transition-all hover:scale-105 active:scale-95 ${
                                systemHealth.status === 'Optimal' 
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
                                : 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 animate-pulse'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                systemHealth.status === 'Optimal' ? 'bg-green-500' : 'bg-amber-500'
                            }`}></span>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${
                                systemHealth.status === 'Optimal' ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                            }`}>
                                {systemHealth.status === 'Optimal' ? 'System Optimal' : 'Scan Needed'}
                            </span>
                        </button>
                    </div>
                    <div className="flex items-center mt-1 text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {dateDisplay}
                    </div>
                </div>
                 <div className="flex items-center self-start md:self-end space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    {filterOptions.map(option => (
                        <button
                            key={option.id}
                            onClick={() => setTimeFilter(option.id)}
                            className={`px-3 py-1.5 rounded-md font-semibold text-xs md:text-sm transition-all ${
                                timeFilter === option.id
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Operational KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                 {/* Priority Card */}
                 <StatCard 
                    title="Albums to Process" 
                    value={kpiData.albumsToProcess.toString()}
                    // Highlight if work is pending
                    className={kpiData.albumsToProcess > 0 ? "ring-2 ring-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10" : ""}
                    onClick={() => onNavigate('Albums')}
                    icon={
                        <div className={kpiData.albumsToProcess > 0 ? "animate-pulse text-amber-600 dark:text-amber-400" : ""}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    }
                />
                <StatCard 
                    title="Pending Orders" 
                    value={kpiData.pendingOrders.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    onClick={() => onNavigate('Orders')}
                />
                <StatCard 
                    title="Today's Photos" 
                    value={kpiData.todaysPhotos.toLocaleString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
                 <StatCard 
                    title="Today's Revenue" 
                    value={formatCurrency(kpiData.todaysRevenue)}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                />
            </div>
            
            {/* Operational Section: Work Queue & Goals */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                 {/* Priority 1: Work Queue */}
                 <div className="xl:col-span-2 flex flex-col">
                     <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">Active Workflow</h2>
                     <div className="flex-1">
                        <AlbumsToProcessWidget 
                            albums={safeData.albums} 
                            photographers={safeData.photographers} 
                            onViewAll={() => onNavigate('Albums')}
                        />
                     </div>
                 </div>
                 {/* Priority 2: Personal Targets */}
                 <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">My Targets</h2>
                    <div className="flex-1">
                        <DailyObjectivesWidget currentUser={currentUser} albums={safeData.albums} />
                    </div>
                 </div>
            </div>
            
            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesChartWidget orders={filteredOrders} />
                </div>
                 <TopPhotographersWidget orders={filteredOrders} photographers={safeData.photographers} />
            </div>
            
            {/* History Section */}
            <div className="grid grid-cols-1 gap-6">
                 <RecentOrdersWidget orders={safeData.orders} onOrderClick={(orderId) => {
                     // Navigate to orders page - could be enhanced to show specific order
                     onNavigate('Orders');
                 }} />
            </div>
        </div>
    );
};

export default Dashboard;
