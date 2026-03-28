
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Order, Photographer } from '../types';
import OrderEditModal from './modals/OrderEditModal';
import CreateOrderModal from './modals/CreateOrderModal';
import { useCurrency } from './CurrencyContext';

import { usePermissions } from '../hooks/usePermissions';
import Card from './common/Card';
import OrdersBoard from './orders/OrdersBoard';
import { useDebounce } from '../hooks/useDebounce';
import { OrderCardSkeleton, ListItemSkeleton, StatCardSkeleton } from './common/Skeleton';
import { useInfiniteOrders, useUpdateOrder, useDeleteOrder } from '../hooks/useOrders';
import { usePhotographers } from '../hooks/usePhotographers';
import PageHeader from './common/PageHeader';
import OrdersList from './orders/OrdersList';
import FulfillmentView from './FulfillmentView';
import ConfirmationModal from './common/ConfirmationModal';
import { logger } from '../utils/logger';

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
    /** Trigger for refreshing data */
    refreshTrigger?: number;
}

/**
 * Filter state interface
 */
interface FilterState {
    status: 'All' | Order['status'];
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
    paymentStatus: 'All' | 'Paid' | 'Pending' | 'Refunded';
}

/**
 * Payment status derived from order status
 */
type PaymentStatus = 'Paid' | 'Pending' | 'Refunded';

/**
 * Get payment status from order
 */
const getPaymentStatus = (order: Order): PaymentStatus => {
    if (order.status === 'Cancelled') return 'Refunded';
    if (order.status === 'Completed' || order.status === 'Delivered') return 'Paid';
    return 'Pending';
};

/**
 * CSV export utility
 */
const exportToCSV = (orders: Order[], formatCurrency: (amount: number) => string): string => {
    const headers = [
        'Order ID',
        'Order Number',
        'Date',
        'Client Name',
        'Email',
        'Status',
        'Payment Status',
        'Payment Method',
        'Total',
        'Items Count',
        'Photographer ID',
        'Source'
    ];

    const rows = orders.map(order => [
        order.id,
        order.orderNumber || order.id.substring(0, 8),
        order.date,
        order.clientName,
        order.email,
        order.status,
        getPaymentStatus(order),
        order.paymentMethod || 'Cash',
        formatCurrency(order.total),
        order.items?.length || 0,
        order.photographerId,
        order.source || 'manual'
    ]);

    const escapeCell = (cell: string | number): string => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    return [headers.join(','), ...rows.map(row => row.map(escapeCell).join(','))].join('\n');
};

/**
 * Download CSV file
 */
const downloadCSV = (content: string, filename: string): void => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

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

/**
 * Filter Panel Component
 */
interface FilterPanelProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    isOpen: boolean;
    onToggle: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = React.memo(({ filters, onFiltersChange, isOpen, onToggle }) => {
    const handleReset = useCallback(() => {
        onFiltersChange({
            status: 'All',
            dateFrom: '',
            dateTo: '',
            amountMin: '',
            amountMax: '',
            paymentStatus: 'All'
        });
    }, [onFiltersChange]);

    const hasActiveFilters = useMemo(() =>
        filters.status !== 'All' ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.amountMin ||
        filters.amountMax ||
        filters.paymentStatus !== 'All',
        [filters]
    );

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasActiveFilters
                    ? 'glass-button bg-blue-500/10 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/50'
                    }`}
                aria-label="Toggle filters"
                aria-expanded={isOpen ? 'true' : 'false'}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {hasActiveFilters && (
                    <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {[filters.status, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax, filters.paymentStatus]
                            .filter(f => f && f !== 'All').length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 glass-card rounded-xl shadow-2xl p-4 z-50">
                    <div className="space-y-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Order Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as FilterState['status'] })}
                                className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                            >
                                <option value="All" className="bg-white dark:bg-slate-800">All Statuses</option>
                                <option value="Pending" className="bg-white dark:bg-slate-800">Pending</option>
                                <option value="Processing" className="bg-white dark:bg-slate-800">Processing</option>
                                <option value="Completed" className="bg-white dark:bg-slate-800">Completed</option>
                                <option value="Delivered" className="bg-white dark:bg-slate-800">Delivered</option>
                                <option value="Cancelled" className="bg-white dark:bg-slate-800">Cancelled</option>
                            </select>
                        </div>

                        {/* Payment Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Payment Status</label>
                            <select
                                value={filters.paymentStatus}
                                onChange={(e) => onFiltersChange({ ...filters, paymentStatus: e.target.value as FilterState['paymentStatus'] })}
                                className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                            >
                                <option value="All" className="bg-white dark:bg-slate-800">All Payments</option>
                                <option value="Paid" className="bg-white dark:bg-slate-800">Paid</option>
                                <option value="Pending" className="bg-white dark:bg-slate-800">Pending</option>
                                <option value="Refunded" className="bg-white dark:bg-slate-800">Refunded</option>
                            </select>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Date Range</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                                    className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                                    placeholder="From"
                                />
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                                    className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                                    placeholder="To"
                                />
                            </div>
                        </div>

                        {/* Amount Range */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Amount Range</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number"
                                    value={filters.amountMin}
                                    onChange={(e) => onFiltersChange({ ...filters, amountMin: e.target.value })}
                                    placeholder="Min"
                                    min="0"
                                    className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                                />
                                <input
                                    type="number"
                                    value={filters.amountMax}
                                    onChange={(e) => onFiltersChange({ ...filters, amountMax: e.target.value })}
                                    placeholder="Max"
                                    min="0"
                                    className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                                />
                            </div>
                        </div>

                        {/* Reset Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleReset}
                                className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

FilterPanel.displayName = 'FilterPanel';

/**
 * Bulk Actions Bar Component
 */
interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onExport: () => void;
    onDelete: () => void;
    isAllSelected: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = React.memo(({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onExport,
    onDelete,
    isAllSelected
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="flex items-center justify-between glass-panel rounded-xl px-4 py-3 mb-6 animate-fadeIn">
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={isAllSelected ? onDeselectAll : onSelectAll}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 bg-white/50 dark:bg-slate-700/50"
                    aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
                />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {selectedCount === totalCount
                        ? `All ${totalCount} orders selected`
                        : `${selectedCount} of ${totalCount} orders selected`}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
                <button
                    onClick={onDeselectAll}
                    className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/20 transition-all ml-1"
                    aria-label="Clear selection"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
});

BulkActionsBar.displayName = 'BulkActionsBar';

/**
 * Orders Component
 * 
 * Main component for viewing and managing orders in the Master Portal.
 * 
 * Features:
 * - Order list and board views
 * - Search and advanced filter functionality (date range, amount range, payment status)
 * - Bulk actions (select, export, delete)
 * - Order status management
 * - Order editing and completion
 * - Print order and receipt
 * - Lab folder integration
 * - Statistics display (total revenue, pending orders, etc.)
 * - Permission-based access control
 * - CSV export functionality
 * - Loading skeletons
 * - Comprehensive logging
 * 
 * @param {OrdersProps} props - Component props
 */
const Orders: React.FC<OrdersProps> = ({ showToast, currentUser, onPrintOrder, onPrintReceipt, onOpenLabFolder, refreshTrigger }) => {
    // Modal state
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Currency and permissions
    const { formatCurrency } = useCurrency();
    const { can } = usePermissions(currentUser);

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'fulfillment'>('list');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // Advanced filters
    const [filters, setFilters] = useState<FilterState>({
        status: 'All',
        dateFrom: '',
        dateTo: '',
        amountMin: '',
        amountMax: '',
        paymentStatus: 'All'
    });

    // Bulk selection state
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    // Delete confirmation modal state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Delete mutation
    const deleteOrderMutation = useDeleteOrder();

    // Action menu ref for click outside handling
    const actionMenuRef = useRef<HTMLDivElement>(null);

    // Log component mount
    useEffect(() => {
        logger.info('Orders component mounted', { userId: currentUser?.id });
        return () => {
            logger.info('Orders component unmounted');
        };
    }, [currentUser?.id]);

    // Log filter changes
    useEffect(() => {
        logger.debug('Filters updated', { filters, searchTerm: debouncedSearchTerm });
    }, [filters, debouncedSearchTerm]);

    /**
     * Build filter string for API query
     */
    const filterString = useMemo(() => {
        const apiFilters: string[] = [];

        // Search filter
        if (debouncedSearchTerm) {
            apiFilters.push(`(id~"${debouncedSearchTerm}" || clientName~"${debouncedSearchTerm}" || email~"${debouncedSearchTerm}" || orderNumber~"${debouncedSearchTerm}")`);
        }

        // Status filter
        if (filters.status !== 'All') {
            apiFilters.push(`status="${filters.status}"`);
        }

        // Date range filter
        if (filters.dateFrom) {
            apiFilters.push(`date>="${filters.dateFrom}"`);
        }
        if (filters.dateTo) {
            apiFilters.push(`date<="${filters.dateTo}"`);
        }

        // Amount range filter (client-side for now, can be moved to API)
        if (filters.amountMin) {
            apiFilters.push(`total>=${parseFloat(filters.amountMin)}`);
        }
        if (filters.amountMax) {
            apiFilters.push(`total<=${parseFloat(filters.amountMax)}`);
        }

        // Permission filter
        if (!can('viewAllOrders')) {
            apiFilters.push(`photographerId="${currentUser.id}"`);
        }

        return apiFilters.length > 0 ? apiFilters.join(' && ') : '';
    }, [debouncedSearchTerm, filters, currentUser.id, can]);

    // React Query hooks
    const {
        data: infiniteData,
        isLoading,
        error: queryError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteOrders(filterString);

    const { data: photographers = [] } = usePhotographers();
    const updateOrderMutation = useUpdateOrder();

    // Flatten orders from all pages
    const allOrders = useMemo(() => {
        return infiniteData?.pages.flatMap(p => p.items) || [];
    }, [infiniteData]);

    /**
     * Apply client-side payment status filter
     */
    const filteredOrders = useMemo(() => {
        if (filters.paymentStatus === 'All') {
            return allOrders;
        }
        return allOrders.filter(order => getPaymentStatus(order) === filters.paymentStatus);
    }, [allOrders, filters.paymentStatus]);

    // Error handling
    const error = queryError ? 'Failed to fetch orders.' : null;

    // Click outside handler for action menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                // Action menu handling is now in child components
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Refresh trigger effect
    useEffect(() => {
        if (refreshTrigger) {
            logger.info('Refreshing orders due to refreshTrigger', { refreshTrigger });
            refetch();
        }
    }, [refreshTrigger, refetch]);

    /**
     * Calculate KPI data
     */
    const kpiData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        if (viewMode === 'fulfillment') {
            return {
                pending: allOrders.filter(o => o.status === 'Pending').length,
                processing: allOrders.filter(o => o.status === 'Processing').length,
                completed: allOrders.filter(o => o.status === 'Completed').length,
                total: allOrders.length
            };
        }

        return {
            totalRevenue: allOrders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + o.total, 0),
            pendingOrders: allOrders.filter(o => o.status === 'Pending').length,
            completedToday: allOrders.filter(o => o.status === 'Completed' && o.date === today).length,
            needsDelivery: allOrders.filter(o => o.status === 'Completed').length,
            totalOrders: allOrders.length,
            paidOrders: allOrders.filter(o => getPaymentStatus(o) === 'Paid').length,
            pendingPayment: allOrders.filter(o => getPaymentStatus(o) === 'Pending').length
        };
    }, [allOrders, viewMode]);

    /**
     * Handle order update
     */
    const handleUpdateOrder = useCallback(async (updatedOrder: Order) => {
        try {
            logger.info('Updating order', { orderId: updatedOrder.id });
            await updateOrderMutation.mutateAsync({
                id: updatedOrder.id,
                data: updatedOrder
            });
            setSelectedOrder(null);
            showToast(`Order ${updatedOrder.id} has been updated.`);
            logger.info('Order updated successfully', { orderId: updatedOrder.id });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            logger.error('Failed to update order', error, { orderId: updatedOrder.id });
            showToast(`Error: Failed to update order.`);
        }
    }, [updateOrderMutation, showToast]);

    /**
     * Handle status change
     */
    const handleStatusChange = useCallback(async (orderId: string, newStatus: Order['status']) => {
        try {
            logger.info('Changing order status', { orderId, newStatus });
            await updateOrderMutation.mutateAsync({
                id: orderId,
                data: { status: newStatus }
            });
            showToast(`Order ${orderId} marked as ${newStatus}.`);
            logger.info('Order status changed successfully', { orderId, newStatus });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Failed to change order status', err, { orderId, newStatus });
            showToast('Error updating order status.');
        }
    }, [updateOrderMutation, showToast]);

    /**
     * Bulk selection handlers
     */
    const handleSelectOrder = useCallback((orderId: string, selected: boolean) => {
        setSelectedOrderIds(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(orderId);
                logger.debug('Order selected', { orderId });
            } else {
                newSet.delete(orderId);
                logger.debug('Order deselected', { orderId });
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
        logger.info('All orders selected', { count: filteredOrders.length });
    }, [filteredOrders]);

    const handleDeselectAll = useCallback(() => {
        setSelectedOrderIds(new Set());
        logger.info('All orders deselected');
    }, []);

    const isAllSelected = selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0;

    /**
     * Export selected orders to CSV
     */
    const handleExportCSV = useCallback(() => {
        const ordersToExport = filteredOrders.filter(o => selectedOrderIds.has(o.id));
        if (ordersToExport.length === 0) {
            showToast('No orders selected for export');
            return;
        }

        logger.info('Exporting orders to CSV', { count: ordersToExport.length });
        const csvContent = exportToCSV(ordersToExport, formatCurrency);
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSV(csvContent, `orders_export_${timestamp}.csv`);
        showToast(`${ordersToExport.length} orders exported to CSV`);
        logger.info('CSV export completed', { count: ordersToExport.length });
    }, [filteredOrders, selectedOrderIds, formatCurrency, showToast]);

    /**
     * Handle bulk delete - show confirmation modal
     */
    const handleBulkDelete = useCallback(() => {
        const count = selectedOrderIds.size;
        if (count === 0) {
            showToast('Please select orders to delete');
            return;
        }
        logger.warn('Bulk delete requested', { count });
        setShowDeleteConfirm(true);
    }, [selectedOrderIds, showToast]);

    /**
     * Confirm and execute bulk delete
     */
    const confirmBulkDelete = useCallback(async () => {
        const count = selectedOrderIds.size;
        if (count === 0) return;

        setIsDeleting(true);
        logger.info('Starting bulk delete', { count });

        let successCount = 0;
        let errorCount = 0;

        // Delete orders sequentially to avoid overwhelming the API
        for (const orderId of selectedOrderIds) {
            try {
                await deleteOrderMutation.mutateAsync(orderId);
                successCount++;
            } catch (error) {
                errorCount++;
                logger.error(`Failed to delete order ${orderId}`, error);
            }
        }

        setIsDeleting(false);
        setShowDeleteConfirm(false);
        setSelectedOrderIds(new Set()); // Clear selection

        if (errorCount === 0) {
            showToast(`Successfully deleted ${successCount} orders`);
        } else {
            showToast(`Deleted ${successCount} orders, ${errorCount} failed`);
        }

        logger.info('Bulk delete completed', { successCount, errorCount });
    }, [selectedOrderIds, deleteOrderMutation, showToast]);

    // Error state
    if (error) {
        logger.error('Error loading orders', new Error(error));
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] sm:min-h-[400px] p-4">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 sm:mb-2">Error Loading Orders</h3>
                <p className="text-sm sm:text-base text-red-500 dark:text-red-400 mb-3 sm:mb-4 text-center max-w-md">{error}</p>
                <button
                    onClick={() => {
                        logger.info('Retrying orders load');
                        refetch();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
                    aria-label="Retry loading orders"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="text-slate-800 dark:text-white h-full flex flex-col animate-fadeIn">
            <PageHeader
                title={viewMode === 'fulfillment' ? "Fulfillment Lab" : "Orders"}
                subtitle={viewMode === 'fulfillment' ? "Monitor and manage real-time order production status" : "Manage customer orders, track status, and process deliveries"}
                actions={
                    <>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                logger.info('Opening create order modal');
                                setIsCreateModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm"
                            title="Create Manual Order"
                            aria-label="Create manual order"
                            type="button"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="hidden sm:inline">Create Manual Order</span>
                            <span className="sm:hidden">Create</span>
                        </button>
                        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg sm:rounded-xl flex space-x-1 shadow-sm">
                            <button
                                onClick={() => {
                                    logger.debug('Switching to list view');
                                    setViewMode('list');
                                }}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold sm:font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                title="List View"
                                aria-label="Switch to list view"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                <span className="hidden sm:inline">List</span>
                            </button>
                            <button
                                onClick={() => {
                                    logger.debug('Switching to board view');
                                    setViewMode('board');
                                }}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold sm:font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                title="Board View"
                                aria-label="Switch to board view"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                                <span className="hidden sm:inline">Board</span>
                            </button>
                            <button
                                onClick={() => {
                                    logger.debug('Switching to fulfillment view');
                                    setViewMode('fulfillment');
                                }}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold sm:font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${viewMode === 'fulfillment' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                title="Fulfillment View"
                                aria-label="Switch to fulfillment view"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                <span className="hidden sm:inline">Fulfillment</span>
                            </button>
                        </div>
                    </>
                }
            />

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-4 sm:mb-5 md:mb-6 flex-shrink-0">
                {isLoading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : viewMode === 'fulfillment' ? (
                    <>
                        <StatCard
                            title="Awaiting Production"
                            value={(kpiData as any).pending || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard
                            title="On the Lab Bench"
                            value={(kpiData as any).processing || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                        />
                        <StatCard
                            title="Ready for Client"
                            value={(kpiData as any).completed || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        />
                        <StatCard
                            title="Total in Lab"
                            value={(kpiData as any).total || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                        />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="Total Revenue"
                            value={formatCurrency((kpiData as any).totalRevenue || 0)}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                        />
                        <StatCard
                            title="Pending Orders"
                            value={(kpiData as any).pendingOrders || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard
                            title="Completed Today"
                            value={(kpiData as any).completedToday || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        />
                        <StatCard
                            title="Ready for Delivery"
                            value={(kpiData as any).needsDelivery || 0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
                        />
                    </>
                )}
            </div>

            {/* Search and Filters */}
            <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
                <div className="relative w-full md:max-w-sm group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by ID, client, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 sm:pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        aria-label="Search orders"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <FilterPanel
                        filters={filters}
                        onFiltersChange={setFilters}
                        isOpen={isFilterPanelOpen}
                        onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    />

                    {/* Export all button (when no selection) */}
                    {selectedOrderIds.size === 0 && filteredOrders.length > 0 && (
                        <button
                            onClick={() => {
                                logger.info('Exporting all visible orders to CSV', { count: filteredOrders.length });
                                const csvContent = exportToCSV(filteredOrders, formatCurrency);
                                const timestamp = new Date().toISOString().split('T')[0];
                                downloadCSV(csvContent, `orders_export_${timestamp}.csv`);
                                showToast(`${filteredOrders.length} orders exported to CSV`);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Export all visible orders"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {viewMode === 'list' && (
                <BulkActionsBar
                    selectedCount={selectedOrderIds.size}
                    totalCount={filteredOrders.length}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onExport={handleExportCSV}
                    onDelete={handleBulkDelete}
                    isAllSelected={isAllSelected}
                />
            )}

            {/* Orders Content */}
            <div className="flex-grow overflow-hidden">
                {viewMode === 'fulfillment' ? (
                    <FulfillmentView
                        showToast={showToast}
                        currentUser={currentUser}
                        onPrintOrder={onPrintOrder}
                        onPrintReceipt={onPrintReceipt}
                        externalFilter={debouncedSearchTerm ? `(id~"${debouncedSearchTerm}" || clientName~"${debouncedSearchTerm}" || email~"${debouncedSearchTerm}")` : undefined}
                    />
                ) : isLoading ? (
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
                    <div className="flex flex-col h-full">
                        <OrdersBoard
                            orders={filteredOrders}
                            onUpdateStatus={handleStatusChange}
                            onOrderClick={setSelectedOrder}
                        />
                        {hasNextPage && (
                            <div className="flex justify-center p-4">
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {isFetchingNextPage ? 'Loading more orders...' : 'Load More Orders'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <OrdersList
                        orders={filteredOrders}
                        photographers={photographers}
                        isLoading={isLoading}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        onFetchNextPage={fetchNextPage}
                        onOrderClick={setSelectedOrder}
                        onStatusChange={handleStatusChange}
                        onPrintOrder={onPrintOrder}
                        onPrintReceipt={onPrintReceipt}
                        onOpenLabFolder={onOpenLabFolder}
                        selectedOrderIds={selectedOrderIds}
                        onSelectOrder={handleSelectOrder}
                        paymentStatusFilter={filters.paymentStatus}
                    />
                )}
            </div>

            {/* Modals */}
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

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOrderCreated={(order) => {
                    setSelectedOrder(order);
                    setIsCreateModalOpen(false);
                    showToast(`Order ${order.id} created successfully!`);
                    logger.info('Order created', { orderId: order.id });
                }}
                showToast={showToast}
                currentUser={currentUser}
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Orders"
                message={
                    <div>
                        <p className="mb-2">
                            Are you sure you want to delete <strong>{selectedOrderIds.size}</strong> selected orders?
                        </p>
                        <p className="text-sm text-red-500">
                            This action cannot be undone. The orders will be permanently removed from the system.
                        </p>
                    </div>
                }
                confirmButtonText={isDeleting ? 'Deleting...' : 'Delete'}
                cancelButtonText="Cancel"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default Orders;
