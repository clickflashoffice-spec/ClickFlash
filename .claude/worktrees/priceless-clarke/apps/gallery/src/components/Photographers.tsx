import React, { useState, useMemo } from 'react';
import { Photographer, Order } from '../types.ts';
import Card from './common/Card';
import WorkingTimeModal from './photographers/WorkingTimeModal';
import ObjectivesModal from './photographers/ObjectivesModal';
import ConnexionHistoryModal from './photographers/ConnexionHistoryModal';
import UserEditModal from './modals/UserEditModal';
import Spinner from './common/Spinner';
import { useCurrency } from './CurrencyContext';
import IncomeByPhotographerChart from './photographers/IncomeByPhotographerChart';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useDebounce } from '../hooks/useDebounce.ts';

/**
 * Photographers Component Props
 */
interface PhotographersProps {
    /** Current logged-in user */
    currentUser: Photographer;
    /** List of all photographers */
    photographers: Photographer[];
    /** List of all orders (for performance calculations) */
    orders: Order[];
    /** Callback to refresh data */
    refreshData: () => void;
}

type ModalType = 'workingTime' | 'objectives' | 'history' | 'edit';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </Card>
);

const PhotographerPerformanceCard: React.FC<{
    photographer: Photographer;
    totalSales: number;
    orderCount: number;
    photoCount: number;
    onOpenModal: (type: ModalType, photographer: Photographer) => void;
}> = ({ photographer, totalSales, orderCount, photoCount, onOpenModal }) => {
    const { formatCurrency } = useCurrency();
    
    const target = photographer.monthlyTarget || 0;
    const progress = target > 0 ? (totalSales / target) * 100 : 0;
    const progressPercentage = Math.min(progress, 100);

    return (
        <Card className="text-center flex flex-col items-center hover:shadow-lg transition-all duration-300">
            <div className="relative mb-4">
                <img 
                    src={photographer.avatarUrl || 'https://i.imgur.com/3Y2j2s2.png'} 
                    alt={photographer.name}
                    className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-700 object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://i.imgur.com/3Y2j2s2.png';
                    }}
                />
                {orderCount > 0 && totalSales > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full p-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </div>
                )}
            </div>
            <h2 className="text-xl font-bold">{photographer.name}</h2>
            <p className="text-slate-500 dark:text-slate-400">{photographer.specialty}</p>
             <span className={`mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                photographer.role === 'Admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'
            }`}>
                {photographer.role}
            </span>
             <div className="w-full mt-4 grid grid-cols-2 gap-2 text-center border-t border-b py-3 border-slate-200 dark:border-slate-700">
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Orders</p>
                    <p className="font-bold text-xl text-slate-900 dark:text-white mt-1">{orderCount}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Photos</p>
                    <p className="font-bold text-xl text-slate-900 dark:text-white mt-1">{photoCount.toLocaleString()}</p>
                </div>
            </div>
            {totalSales > 0 && (
                <div className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Total Sales</span>
                        <span className="font-mono font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(totalSales)}</span>
                    </div>
                </div>
            )}
             {target > 0 && (
                 <div className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                     <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">Monthly Target Progress</h3>
                     <div className="flex justify-between items-baseline text-xs mb-1">
                         <span className="font-mono text-green-600 dark:text-green-400 font-semibold">{formatCurrency(totalSales)}</span>
                         <span className="text-slate-500 dark:text-slate-400">{formatCurrency(target)}</span>
                     </div>
                     <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-1 overflow-hidden">
                         <div 
                             className={`h-2.5 rounded-full transition-all duration-500 ${
                                 progressPercentage >= 100 ? 'bg-green-500' : 
                                 progressPercentage >= 75 ? 'bg-blue-500' : 
                                 progressPercentage >= 50 ? 'bg-yellow-500' : 
                                 'bg-orange-500'
                             }`} 
                             style={{ width: `${progressPercentage}%` }}
                         ></div>
                     </div>
                     {progressPercentage >= 100 && (
                         <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1 text-center">🎉 Target Achieved!</p>
                     )}
                 </div>
            )}
             <div className="w-full mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-sm">
                <button onClick={() => onOpenModal('workingTime', photographer)} className="w-full bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md transition-colors">Working Time</button>
                <button onClick={() => onOpenModal('history', photographer)} className="w-full bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md transition-colors">Login History</button>
                <button onClick={() => onOpenModal('objectives', photographer)} className="w-full bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-1.5 px-3 rounded-md transition-colors">Daily Objective</button>
                <button onClick={() => onOpenModal('edit', photographer)} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 font-semibold py-1.5 px-3 rounded-md transition-colors">Edit Details</button>
             </div>
        </Card>
    );
};

/**
 * Photographers Component
 * 
 * Component for viewing and managing photographers in the Master Portal.
 * 
 * Features:
 * - Photographer performance metrics (sales, orders, photos)
 * - Monthly target tracking with progress indicators
 * - Income charts by photographer
 * - Working time management
 * - Objectives management
 * - Connection history
 * - User editing capabilities
 * - Search and filter functionality
 * 
 * @param {PhotographersProps} props - Component props
 */
const Photographers: React.FC<PhotographersProps> = ({ currentUser, photographers, orders, refreshData }) => {
    const [modal, setModal] = useState<ModalType | null>(null);
    const [selectedPhotographer, setSelectedPhotographer] = useState<Photographer | null>(null);
    const [userToEdit, setUserToEdit] = useState<Photographer | null>(null);
    const { can } = usePermissions(currentUser);
    const { formatCurrency } = useCurrency();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedPhotographerId, setSelectedPhotographerId] = useState<number | 'all'>('all');

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (startDate && order.date < startDate) return false;
            if (endDate && order.date > endDate) return false;
            if (selectedPhotographerId !== 'all' && order.photographerId !== selectedPhotographerId) return false;

            return true;
        });
    }, [orders, startDate, endDate, selectedPhotographerId]);

    const performanceData = useMemo(() => {
        const dataMap = new Map<string, { sales: number; orderCount: number; photoCount: number }>();

        filteredOrders.forEach(order => {
            if (order.photographerId && order.status === 'Completed') {
                const key = String(order.photographerId);
                const currentData = dataMap.get(key) || { sales: 0, orderCount: 0, photoCount: 0 };
                currentData.sales += order.total;
                currentData.orderCount += 1;
                const photoCountInOrder = order.items.filter(item => item.photo).length;
                currentData.photoCount += photoCountInOrder;
                dataMap.set(key, currentData);
            }
        });

        return photographers.map(p => ({
            ...p,
            totalSales: dataMap.get(p.id)?.sales || 0,
            orderCount: dataMap.get(p.id)?.orderCount || 0,
            photoCount: dataMap.get(p.id)?.photoCount || 0,
        }));
    }, [filteredOrders, photographers]);

    const kpiData = useMemo(() => {
        const activePhotographers = performanceData.filter(p => p.orderCount > 0);
        const totalSales = activePhotographers.reduce((sum, p) => sum + p.totalSales, 0);

        if (activePhotographers.length === 0) {
            return {
                totalPhotographers: photographers.length,
                topPerformer: 'N/A',
                mostActive: 'N/A',
                averageSales: 0,
            };
        }

        const topPerformer = [...activePhotographers].sort((a, b) => b.totalSales - a.totalSales)[0];
        const mostActive = [...activePhotographers].sort((a, b) => b.orderCount - a.orderCount)[0];
        const averageSales = totalSales / activePhotographers.length;

        return {
            totalPhotographers: photographers.length,
            topPerformer: topPerformer.name,
            mostActive: mostActive.name,
            averageSales,
        };
    }, [performanceData, photographers.length]);


    const openModal = (type: ModalType, photographer: Photographer) => {
        if (type === 'edit') {
            setUserToEdit(photographer);
        }
        setSelectedPhotographer(photographer);
        setModal(type);
    };

    const closeModal = () => {
        setSelectedPhotographer(null);
        setUserToEdit(null);
        setModal(null);
    };

    const handleSaveObjective = () => {
        refreshData();
        closeModal();
    };
    
    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setSelectedPhotographerId('all');
    };

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const filteredPerformanceData = useMemo(() => {
        if (!debouncedSearchTerm) return performanceData;
        const searchLower = debouncedSearchTerm.toLowerCase();
        return performanceData.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.specialty?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower)
        );
    }, [performanceData, debouncedSearchTerm]);

    return (
        <div className="animate-fadeIn pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Photographers</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage team members, track performance, and set objectives</p>
                </div>
                {can('managePhotographers') && (
                     <button 
                        onClick={() => {
                            setUserToEdit(null);
                            setModal('edit');
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Photographer
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                <StatCard 
                    title="Total Photographers" 
                    value={kpiData.totalPhotographers} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015.5-4.93a6.97 6.97 0 00-1.5 4.33A6.97 6.97 0 009 16c0 .34.024.673.07 1H1V6a5 5 0 015-5z" /></svg>} 
                />
                <StatCard 
                    title="Top Performer" 
                    value={kpiData.topPerformer} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} 
                />
                <StatCard 
                    title="Most Active" 
                    value={kpiData.mostActive} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm10.5 5.5a1 1 0 00-1-1H5.5a1 1 0 000 2H13a1 1 0 001.5-1.5zm-1 4a1 1 0 00-1-1H5.5a1 1 0 000 2H13a1 1 0 001.5-1.5z" clipRule="evenodd" /></svg>} 
                />
                <StatCard 
                    title="Average Sales" 
                    value={formatCurrency(kpiData.averageSales)} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} 
                />
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative w-full md:max-w-md group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search photographers by name, specialty, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                {debouncedSearchTerm && (
                    <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Found <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPerformanceData.length}</span> {filteredPerformanceData.length === 1 ? 'photographer' : 'photographers'}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                    <IncomeByPhotographerChart orders={filteredOrders} photographers={photographers} />
                </div>
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filters</h3>
                        {(startDate || endDate || selectedPhotographerId !== 'all') && (
                            <button 
                                onClick={resetFilters}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="photographer-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Photographer</label>
                            <select
                                id="photographer-filter"
                                value={selectedPhotographerId}
                                onChange={e => setSelectedPhotographerId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="all">All Photographers</option>
                                {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">From Date</label>
                                <input 
                                    type="date" 
                                    id="start-date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                />
                            </div>
                             <div>
                                <label htmlFor="end-date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">To Date</label>
                                <input 
                                    type="date" 
                                    id="end-date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>


            {photographers.length > 0 ? (
                filteredPerformanceData.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {filteredPerformanceData.map(p => (
                            <PhotographerPerformanceCard 
                                key={p.id} 
                                photographer={p} 
                                totalSales={p.totalSales}
                                orderCount={p.orderCount}
                                photoCount={p.photoCount}
                                onOpenModal={openModal}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <div className="bg-white dark:bg-slate-800 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Photographers Found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {debouncedSearchTerm 
                                ? `No photographers match "${debouncedSearchTerm}". Try adjusting your search.`
                                : "No photographers match your current filters."}
                        </p>
                    </div>
                )
            ) : (
                <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="bg-white dark:bg-slate-800 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Photographers Yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        Add your first photographer to start tracking team performance and managing objectives.
                    </p>
                    {can('managePhotographers') && (
                        <button 
                            onClick={() => {
                                setUserToEdit(null);
                                setModal('edit');
                            }} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Photographer
                        </button>
                    )}
                </div>
            )}

            <>
                {selectedPhotographer && (
                <>
                    <WorkingTimeModal 
                        isOpen={modal === 'workingTime'}
                        onClose={closeModal}
                        photographer={selectedPhotographer}
                    />
                    <ObjectivesModal
                        isOpen={modal === 'objectives'}
                        onClose={closeModal}
                        photographer={selectedPhotographer}
                        onSave={handleSaveObjective}
                    />
                    <ConnexionHistoryModal
                        isOpen={modal === 'history'}
                        onClose={closeModal}
                        photographer={selectedPhotographer}
                    />
                </>
                )}
                <UserEditModal 
                    isOpen={modal === 'edit'}
                    onClose={closeModal}
                    onDataChange={refreshData}
                    userToEdit={userToEdit}
                    availableRoles={['Admin', 'Team Leader', 'Photographer']}
                />
            </>
        </div>
    );
};

export default Photographers;