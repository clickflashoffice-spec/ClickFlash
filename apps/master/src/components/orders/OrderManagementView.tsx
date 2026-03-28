import React, { useState, useMemo, useCallback } from 'react';
import { Order, OrderItem } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import { orderService } from '../../services/api/orderService';
import OrderPrintCard from './OrderPrintCard';
import FilterPanel, { FilterOptions } from './FilterPanel';
import { useDebounce } from '../../hooks/useDebounce';
import ReprocessModal from './ReprocessModal';
import Toast from '../common/Toast';

interface OrderManagementViewProps {
    order: Order;
    onBack: () => void;
    onUpdateOrder: (order: Order) => void;
}

const OrderManagementView: React.FC<OrderManagementViewProps> = ({ order, onBack, onUpdateOrder }) => {
    const [printedItems, setPrintedItems] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isUpdating, setIsUpdating] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({
        statuses: [],
        searchTerm: '',
        dateFrom: '',
        dateTo: ''
    });

    // Reprocess Modal State
    const [reprocessModalOpen, setReprocessModalOpen] = useState(false);
    const [activeReprocessItemId, setActiveReprocessItemId] = useState<string | undefined>(undefined);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Debounce search term for performance
    const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);

    // Filter items based on search
    const filteredItems = useMemo(() => {
        return order.items.filter(item => {
            if (debouncedSearchTerm) {
                const searchLower = debouncedSearchTerm.toLowerCase();
                const matchesSearch =
                    item.name.toLowerCase().includes(searchLower) ||
                    item.format?.toLowerCase().includes(searchLower) ||
                    item.photo?.title?.toLowerCase().includes(searchLower);

                if (!matchesSearch) return false;
            }
            return true;
        });
    }, [order.items, debouncedSearchTerm]);

    // Handle status update
    const handleStatusUpdate = async (newStatus: 'Completed' | 'Delivered') => {
        setIsUpdating(true);
        try {
            const updatedOrder = await apiService.updateOrder(order.id, { status: newStatus });
            onUpdateOrder(updatedOrder);
        } catch (error) {
            console.error('Failed to update order status', error);
            showToast('Failed to update order status');
        } finally {
            setIsUpdating(false);
        }
    };

    // Open order folder in file explorer
    const openOrderFolder = useCallback(async () => {
        try {
            // Call backend API to open the order folder
            const response = await fetch(`/api/orders/${order.id}/open-folder`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to open folder');
            }
        } catch (error) {
            console.error('Failed to open order folder:', error);
            showToast('Failed to open order folder. Please check if the folder exists.');
        }
    }, [order.id]);

    // Rule 1.1d: Print single item via Backend API (High-Res)
    const handlePrint = useCallback(async (item: OrderItem) => {
        const photoId = item.photoId || (item.photo && item.photo.id);
        if (!photoId) {
            showToast('Cannot print: Missing photo ID');
            return;
        }

        try {
            // Optimistic UI update
            setPrintedItems(prev => new Set(prev).add(item.id));

            await orderService.printOrderPhoto(order.id, photoId);

            showToast('Print enqueued successfully');
        } catch (error) {
            console.error('Print failed:', error);
            showToast('Failed to print: ' + (error instanceof Error ? error.message : String(error)));
            // Revert optimistic update on failure
            setPrintedItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
            });
        }
    }, [order.id]);

    const handleReprocess = useCallback((item: OrderItem) => {
        setActiveReprocessItemId(item.id);
        setReprocessModalOpen(true);
    }, []);

    // Print multiple selected items
    const handleBulkPrint = useCallback(() => {
        if (selectedItems.size === 0) {
            showToast('Please select items to print');
            return;
        }

        const itemsToPrint = order.items.filter(item => selectedItems.has(item.id));

        if (confirm(`Print ${itemsToPrint.length} selected item(s)?`)) {
            itemsToPrint.forEach((item, index) => {
                // Stagger prints to avoid overwhelming the browser
                setTimeout(() => {
                    handlePrint(item);
                }, index * 1000);
            });
        }
    }, [selectedItems, order.items, handlePrint]);

    // Toggle item selection
    const handleToggleSelect = useCallback((itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    }, []);

    // Select all items
    const handleSelectAll = useCallback(() => {
        if (selectedItems.size === filteredItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.id)));
        }
    }, [selectedItems.size, filteredItems]);

    // Clear filters
    const handleClearFilters = useCallback(() => {
        setFilters({
            statuses: [],
            searchTerm: '',
            dateFrom: '',
            dateTo: ''
        });
    }, []);

    const allSelected = selectedItems.size > 0 && selectedItems.size === filteredItems.length;
    const someSelected = selectedItems.size > 0 && selectedItems.size < filteredItems.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
            <div className="flex h-screen overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header... */}
                    {/* (Omitted unchanged header for brevity in replace_file_content) */}
                    <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 p-6 shadow-2xl sticky top-0 z-30">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={onBack}
                                    className="p-2 rounded-xl hover:bg-slate-800 transition-all text-slate-400 hover:text-white hover:scale-110 active:scale-95"
                                    title="Back to Orders"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>

                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                            Order Management
                                        </h1>
                                    </div>
                                    <div className="flex items-center space-x-3 text-sm">
                                        <span className="font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">
                                            #{order.orderNumber || order.id}
                                        </span>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-white font-semibold">{order.clientName}</span>
                                        <span className="text-slate-500">•</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                            order.status === 'Delivered' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' :
                                                'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Open Folder Button */}
                                <button
                                    onClick={openOrderFolder}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700 hover:border-slate-600 flex items-center gap-2"
                                    title="Open Order Folder"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="hidden sm:inline">Folder</span>
                                </button>

                                {/* Delivery Button */}
                                <button
                                    onClick={() => handleStatusUpdate('Delivered')}
                                    disabled={order.status === 'Delivered' || isUpdating}
                                    className={`px-4 py-2 font-bold rounded-xl transition-all flex items-center gap-2 ${order.status === 'Delivered'
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-600/30'
                                        }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {order.status === 'Delivered' ? 'Delivered' : 'Mark Delivered'}
                                </button>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-700/50">
                            <div className="flex items-center gap-4">
                                {/* Select All */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(input) => {
                                            if (input) input.indeterminate = someSelected;
                                        }}
                                        onChange={handleSelectAll}
                                        className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all"
                                    />
                                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                                        Select All ({selectedItems.size}/{filteredItems.length})
                                    </span>
                                </label>

                                {/* Bulk Print */}
                                {selectedItems.size > 0 && (
                                    <button
                                        onClick={handleBulkPrint}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Print Selected ({selectedItems.size})
                                    </button>
                                )}
                            </div>

                            {/* Progress */}
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Progress</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-green-400 font-bold text-lg">{printedItems.size}</span>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-lg">{order.items.length}</span>
                                    </div>
                                </div>
                                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                                        style={{ width: `${(printedItems.size / order.items.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Items Grid */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-xl font-bold">No items found</p>
                                <p className="text-sm mt-2">Try adjusting your filters</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                                {filteredItems.map((item) => (
                                    <OrderPrintCard
                                        key={item.id}
                                        item={item}
                                        orderId={order.id}
                                        isPrinted={printedItems.has(item.id)}
                                        isSelected={selectedItems.has(item.id)}
                                        onPrint={handlePrint}
                                        onToggleSelect={handleToggleSelect}
                                        onReprocess={handleReprocess}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Panel */}
                <FilterPanel
                    filters={filters}
                    onFilterChange={setFilters}
                    onClearFilters={handleClearFilters}
                    isOpen={isFilterPanelOpen}
                    onClose={() => setIsFilterPanelOpen(false)}
                />
            </div>

            {/* Reprocess Modal */}
            {reprocessModalOpen && (
                <ReprocessModal
                    isOpen={reprocessModalOpen}
                    onClose={() => setReprocessModalOpen(false)}
                    order={order}
                    initialItemId={activeReprocessItemId}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

export default OrderManagementView;
