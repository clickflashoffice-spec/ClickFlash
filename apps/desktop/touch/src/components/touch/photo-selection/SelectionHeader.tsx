import React from 'react';

interface SelectionHeaderProps {
  onBack: () => void;
  roomNumber?: string;
  lastUpdateTime: string | null;
  onBulkUpdateCart?: boolean;
  canUseFaceSearch: boolean;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  onOpenFaceSearch: () => void;
}

export const SelectionHeader: React.FC<SelectionHeaderProps> = ({
  onBack,
  roomNumber,
  lastUpdateTime,
  onBulkUpdateCart,
  canUseFaceSearch,
  handleSelectAll,
  handleDeselectAll,
  onOpenFaceSearch,
}) => {
  return (
    <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-20 bg-white dark:bg-slate-900 shadow-sm relative">
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xl">Back to Home</span>
      </button>
      <div className="text-center">
        <h1 className="text-3xl font-bold">
          {roomNumber ? `Viewing Room: ${roomNumber}` : 'Your Photos'}
        </h1>
        {lastUpdateTime && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Last updated: {lastUpdateTime}
          </p>
        )}
      </div>
      <div className="w-auto flex justify-end items-center space-x-3">
        {onBulkUpdateCart && (
          <>
            <button
              onClick={handleSelectAll}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              Deselect All
            </button>
          </>
        )}
        {canUseFaceSearch && (
          <button
            onClick={onOpenFaceSearch}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-bold">Find Me (AI)</span>
          </button>
        )}
      </div>
    </header>
  );
};
