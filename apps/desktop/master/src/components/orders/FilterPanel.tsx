import React from 'react';
import { Order } from '../../types';

export interface FilterOptions {
    statuses: Order['status'][];
    searchTerm: string;
    dateFrom: string;
    dateTo: string;
}

interface FilterPanelProps {
    filters: FilterOptions;
    onFilterChange: (filters: FilterOptions) => void;
    onClearFilters: () => void;
    isOpen: boolean;
    onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = React.memo(({
    filters,
    onFilterChange,
    onClearFilters,
    isOpen,
    onClose
}) => {
    const statusOptions: Order['status'][] = ['Pending', 'Processing', 'Completed', 'Delivered', 'Cancelled'];

    const toggleStatus = (status: Order['status']) => {
        const newStatuses = filters.statuses.includes(status)
            ? filters.statuses.filter(s => s !== status)
            : [...filters.statuses, status];

        onFilterChange({ ...filters, statuses: newStatuses });
    };

    const activeFilterCount =
        filters.statuses.length +
        (filters.searchTerm ? 1 : 0) +
        (filters.dateFrom ? 1 : 0) +
        (filters.dateTo ? 1 : 0);

    const getStatusColor = (status: Order['status']) => {
        switch (status) {
            case 'Pending': return 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30';
            case 'Processing': return 'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30';
            case 'Cancelled': return 'bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30';
            case 'Completed': return 'bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30';
            case 'Delivered': return 'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30';
            default: return 'bg-slate-500/20 text-slate-300 border-slate-500/50 hover:bg-slate-500/30';
        }
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div
                className={`fixed lg:sticky top-0 right-0 h-screen w-80 bg-gradient-to-br from-slate-800 to-slate-900 border-l border-slate-700/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 p-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <h2 className="text-lg font-bold text-white">Filters</h2>
                            {activeFilterCount > 0 && (
                                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {activeFilterCount}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={onClearFilters}
                            className="w-full py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold transition-colors border border-red-500/30"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>

                {/* Filter Sections */}
                <div className="p-4 space-y-6">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={filters.searchTerm}
                                onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
                                placeholder="Order ID, client name..."
                                className="w-full px-4 py-2.5 pl-10 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-3">
                            Status
                        </label>
                        <div className="space-y-2">
                            {statusOptions.map((status) => {
                                const isSelected = filters.statuses.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => toggleStatus(status)}
                                        className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border-2 flex items-center justify-between ${isSelected
                                            ? getStatusColor(status)
                                            : 'bg-slate-900/30 text-slate-400 border-slate-700/50 hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <span>{status}</span>
                                        {isSelected && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-3">
                            Date Range
                        </label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">From</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">To</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    {activeFilterCount > 0 && (
                        <div className="pt-4 border-t border-slate-700/50">
                            <p className="text-xs text-slate-400 mb-2">Active Filters:</p>
                            <div className="flex flex-wrap gap-2">
                                {filters.statuses.map((status) => (
                                    <span
                                        key={status}
                                        className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
                                    >
                                        {status}
                                    </span>
                                ))}
                                {filters.searchTerm && (
                                    <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                                        Search: {filters.searchTerm.substring(0, 15)}...
                                    </span>
                                )}
                                {filters.dateFrom && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                        From: {filters.dateFrom}
                                    </span>
                                )}
                                {filters.dateTo && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                        To: {filters.dateTo}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;
