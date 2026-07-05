import React from "react";

interface BulkSelectionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onExport: () => void;
  isSelectionMode: boolean;
  onExitSelectionMode: () => void;
}

const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = React.memo(
  ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onDelete,
    onExport,
    isSelectionMode,
    onExitSelectionMode,
  }) => {
    if (!isSelectionMode) return null;

    return (
      <div className="mb-4 p-3 glass-panel border border-blue-200/50 dark:border-blue-700/50 rounded-lg flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedCount > 0 ? `${selectedCount} selected` : "Selection Mode"}
          </span>
          <div className="h-4 w-px bg-blue-300 dark:bg-blue-700" />
          <button
            onClick={onSelectAll}
            className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 focus:outline-none focus:underline"
          >
            Select All ({totalCount})
          </button>
          {selectedCount > 0 && (
            <button
              onClick={onDeselectAll}
              className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 focus:outline-none focus:underline"
            >
              Deselect All
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </>
          )}
          <button
            onClick={onExitSelectionMode}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
            title="Exit Selection Mode"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  },
);

BulkSelectionToolbar.displayName = "BulkSelectionToolbar";

export default BulkSelectionToolbar;