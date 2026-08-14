import React from 'react';

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

export default BulkActionsBar;
