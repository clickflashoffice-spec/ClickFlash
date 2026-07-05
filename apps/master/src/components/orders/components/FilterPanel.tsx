import React, { useCallback, useMemo } from 'react';
import { FilterState } from '../../Orders';

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

export default FilterPanel;
