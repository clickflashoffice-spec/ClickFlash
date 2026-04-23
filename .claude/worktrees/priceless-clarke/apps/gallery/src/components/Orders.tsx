
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, Photographer } from '../types.ts';
import OrderEditModal from './modals/OrderEditModal';
import { useCurrency } from './CurrencyContext';
import { apiService } from '../services/apiService.ts';
import Spinner from './common/Spinner';
import { usePermissions } from '../hooks/usePermissions.ts';
import Card from './common/Card';
import OrdersBoard from './orders/OrdersBoard';
import { useDebounce } from '../hooks/useDebounce.ts';
import { OrderCardSkeleton, ListItemSkeleton } from './common/Skeleton';
import { useOrders, useUpdateOrder } from '../hooks/useOrders';
import { usePhotographers } from '../hooks/usePhotographers';

/**
 * Orders Component Props
 */
interface OrdersProps {
  /** Function to show toast notifications */
  showToast: (message: string) => void;
  /** Current logged-in user */
  currentUser: Photographer;
  /** Callback to print order */
  onPrintOrder: (order: Order) => void;
  /** Callback to print receipt */
  onPrintReceipt: (order: Order) => void;
  /** Callback to open lab folder */
  onOpenLabFolder: (order: Order) => void;
}

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

/**
 * Orders Component
 * 
 * Main component for viewing and managing orders in the Master Portal.
 * 
 * Features:
 * - Order list and board views
 * - Search and filter functionality
 * - Order status management
 * - Order editing and completion
 * - Print order and receipt
 * - Lab folder integration
 * - Statistics display (total revenue, pending orders, etc.)
 * - Permission-based access control
 * 
 * @param {OrdersProps} props - Component props
 */
const Orders: React.FC<OrdersProps> = ({ showToast, currentUser, onPrintOrder, onPrintReceipt, onOpenLabFolder }) => {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const { formatCurrency } = useCurrency();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [statusFilter, setStatusFilter] = useState<'All' | Order['status']>('All');
    const [viewMode, setViewMode] = useState<'list' | 'board'>('list'); // Added View Mode
    const { can } = usePermissions(currentUser);
    const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    // React Query hooks
    const { data: ordersData = [], isLoading, error: queryError } = useOrders();
    const { data: photographers = [] } = usePhotographers();
    const updateOrderMutation = useUpdateOrder();

    // Sort orders by date (newest first)
    const allOrders = useMemo(() => {
        return [...ordersData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [ordersData]);

    const error = queryError ? 'Failed to fetch orders.' : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const visibleOrders = useMemo(() => {
        if (can('viewAllOrders')) {
            return allOrders;
        }
        return allOrders.filter(order => String(order.photographerId) === currentUser.id);
    }, [allOrders, currentUser, can]);

    const filteredOrders = useMemo(() => {
        return visibleOrders.filter(order => {
            if (debouncedSearchTerm) {
                const searchLower = debouncedSearchTerm.toLowerCase();
                const matchesSearch = 
                    order.id.toLowerCase().includes(searchLower) ||
                    order.clientName.toLowerCase().includes(searchLower) ||
                    (order.email && order.email.toLowerCase().includes(searchLower));
                
                if (!matchesSearch) return false;
            }
            
            const matchesFilter = statusFilter === 'All' || order.status === statusFilter;
            return matchesFilter;
        });
    }, [visibleOrders, debouncedSearchTerm, statusFilter]);
    
    const kpiData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            totalRevenue: filteredOrders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + o.total, 0),
            pendingOrders: filteredOrders.filter(o => o.status === 'Pending').length,
            completedToday: filteredOrders.filter(o => o.status === 'Completed' && o.date === today).length,
            needsDelivery: filteredOrders.filter(o => o.status === 'Completed').length,
        };
    }, [filteredOrders]);


    const handleUpdateOrder = async (updatedOrder: Order) => {
        try {
            await updateOrderMutation.mutateAsync({
                id: updatedOrder.id,
                data: updatedOrder
            });
            setSelectedOrder(null);
            showToast(`Order ${updatedOrder.id} has been updated.`);
        } catch (err) {
            showToast(`Error: Failed to update order.`);
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
        setOpenActionMenu(null);
        try {
            await updateOrderMutation.mutateAsync({
                id: orderId,
                data: { status: newStatus }
            });
            showToast(`Order ${orderId} marked as ${newStatus}.`);
        } catch (error) {
            showToast('Error updating order status.');
        }
    };

    const filterOptions: Array<'All' | Order['status']> = ['All', 'Pending', 'Completed', 'Delivered', 'Cancelled'];

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error Loading Orders</h3>
                <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="text-slate-800 dark:text-white h-full flex flex-col animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Orders</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage customer orders, track status, and process deliveries</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex space-x-1 shadow-sm">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        title="List View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        <span className="hidden sm:inline">List</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('board')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        title="Board View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                        <span className="hidden sm:inline">Board</span>
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 flex-shrink-0">
                <StatCard 
                    title="Total Revenue" 
                    value={formatCurrency(kpiData.totalRevenue)} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} 
                />
                <StatCard 
                    title="Pending Orders" 
                    value={kpiData.pendingOrders} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                />
                <StatCard 
                    title="Completed Today" 
                    value={kpiData.completedToday} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
                />
                <StatCard 
                    title="Ready for Delivery" 
                    value={kpiData.needsDelivery} 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} 
                />
            </div>

            <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-shrink-0">
                <div className="relative w-full md:max-w-sm group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by ID, client, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                </div>
                 {viewMode === 'list' && (
                     <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
                        {filterOptions.map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-md font-semibold text-xs md:text-sm whitespace-nowrap transition-colors ${
                                    statusFilter === status
                                        ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                 )}
            </div>

            <div className="flex-grow overflow-hidden">
                {isLoading ? (
                    viewMode === 'board' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <OrderCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-full overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {[...Array(8)].map((_, i) => (
                                    <ListItemSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    )
                ) : viewMode === 'board' ? (
                    <OrdersBoard 
                        orders={filteredOrders} 
                        onUpdateStatus={handleStatusChange} 
                        onOrderClick={setSelectedOrder} 
                    />
                ) : (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-full overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-800 z-10">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">Order ID</th>
                                    <th className="p-4">Client</th>
                                    <th className="p-4 hidden md:table-cell">Photographer</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Total</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((order) => {
                                    const photographer = photographers.find(p => p.id === String(order.photographerId));
                                    return (
                                    <tr key={order.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                        <td className="p-4">
                                            <p className="font-mono font-semibold text-sm md:text-base">{order.id}</p>
                                            <p className="text-xs text-slate-500 whitespace-nowrap">{new Date(order.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold text-sm md:text-base">{order.clientName || 'N/A'}</p>
                                            {order.email && (
                                                <p className="text-xs text-slate-500 truncate max-w-[100px] md:max-w-[150px]" title={order.email}>{order.email}</p>
                                            )}
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            {photographer ? (
                                                <div className="flex items-center space-x-2">
                                                    <img 
                                                        src={photographer.avatarUrl || 'https://i.imgur.com/3Y2j2s2.png'} 
                                                        alt={photographer.name} 
                                                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://i.imgur.com/3Y2j2s2.png';
                                                        }}
                                                    />
                                                    <span className="text-sm">{photographer.name}</span>
                                                </div>
                                            ) : <span className="text-slate-500 text-sm">Unassigned</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
                                                order.status === 'Completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                                                order.status === 'Delivered' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                                order.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                                'bg-red-500/20 text-red-600 dark:text-red-400'
                                            }`}>
                                                {order.status === 'Pending' && <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse"></span>}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-semibold font-mono text-slate-900 dark:text-white">{formatCurrency(order.total)}</td>
                                        <td className="p-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center space-x-2">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onOpenLabFolder(order);
                                                    }}
                                                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
                                                    title="Open Lab Print Folder"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="hidden sm:inline">Lab Folder</span>
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionMenu(openActionMenu === order.id ? null : order.id);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                                                    aria-label="More options"
                                                    title="More options"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                </button>
                                            </div>
                                            {openActionMenu === order.id && (
                                                <div ref={actionMenuRef} className="absolute right-12 top-0 z-50 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-left overflow-hidden">
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setOpenActionMenu(null); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View Details
                                                    </button>
                                                    {order.status === 'Pending' && <button onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'Completed'); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Mark as Completed
                                                    </button>}
                                                    {order.status === 'Completed' && <button onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'Delivered'); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Mark as Delivered
                                                    </button>}
                                                    <div className="my-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                                    <button onClick={(e) => { e.stopPropagation(); onPrintOrder(order); setOpenActionMenu(null); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                        Print Worksheet
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); onPrintReceipt(order); setOpenActionMenu(null); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                        Print Receipt
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                                {filteredOrders.length === 0 && (
                                     <tr className="h-64">
                                        <td colSpan={6} className="text-center text-slate-500 dark:text-slate-400">
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 w-20 h-20 mb-4 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                       <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 00-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                                    {debouncedSearchTerm ? "No Orders Found" : statusFilter !== 'All' ? `No ${statusFilter} Orders` : "No Orders Yet"}
                                                </h3>
                                                <p className="text-sm max-w-sm mx-auto">
                                                    {debouncedSearchTerm 
                                                        ? `No orders match "${debouncedSearchTerm}". Try adjusting your search.`
                                                        : statusFilter !== 'All'
                                                        ? `There are no ${statusFilter.toLowerCase()} orders at the moment.`
                                                        : "Orders will appear here once they are created."}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
             {selectedOrder && (
                <OrderEditModal 
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    order={selectedOrder}
                    onSave={handleUpdateOrder}
                    showToast={showToast}
                    onPrintOrder={onPrintOrder}
                    onPrintReceipt={onPrintReceipt}
                />
            )}
        </div>
    );
};

export default Orders;
