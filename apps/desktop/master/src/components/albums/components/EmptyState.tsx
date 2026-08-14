import React, { useCallback } from "react";
import { AlbumTab } from "../../../types.ts";

interface EmptyStateProps {
  activeTab: AlbumTab;
  searchTerm: string;
  hasFilters: boolean;
  canImport: boolean;
  onImport: () => void;
  onClearFilters: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = React.memo(
  ({
    activeTab,
    searchTerm,
    hasFilters,
    canImport,
    onImport,
    onClearFilters,
  }) => {
    const getEmptyStateContent = useCallback(() => {
      if (searchTerm) {
        return {
          title: "No Albums Found",
          description: `No albums match your search for "${searchTerm}". Try different keywords or clear the search.`,
          icon: "search",
        };
      }
      if (hasFilters) {
        return {
          title: "No Matching Albums",
          description:
            "No albums match your current filters. Try adjusting your filter criteria.",
          icon: "filter",
          action: onClearFilters,
          actionLabel: "Clear Filters",
        };
      }
      switch (activeTab) {
        case "queue":
          return {
            title: "Processing Queue Empty",
            description:
              "Great job! You've cleared your workspace. Import new photos to get started.",
            icon: "queue",
            action: canImport ? onImport : undefined,
            actionLabel: "Import Album",
          };
        case "live":
          return {
            title: "No Live Albums",
            description:
              "Finalize albums from the queue to display them here and on the Kiosks.",
            icon: "live",
          };
        default:
          return {
            title: "No Albums Yet",
            description:
              "Get started by importing your first album using the 'Import New' button above.",
            icon: "empty",
            action: canImport ? onImport : undefined,
            actionLabel: "Import Album",
          };
      }
    }, [
      activeTab,
      searchTerm,
      hasFilters,
      canImport,
      onImport,
      onClearFilters,
    ]);

    const content = getEmptyStateContent();

    const getIcon = (iconType: string) => {
      switch (iconType) {
        case "search":
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-slate-300 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          );
        case "filter":
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-slate-300 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          );
        case "queue":
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-slate-300 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          );
        case "live":
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-slate-300 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          );
        default:
          return (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 text-slate-300 dark:text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          );
      }
    };

    return (
      <div className="text-center py-16 sm:py-20 md:py-24 glass-panel border-dashed h-[500px] flex flex-col items-center justify-center">
        <div className="glass-card rounded-full p-4 sm:p-5 md:p-6 w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 mx-auto mb-4 sm:mb-5 md:mb-6 flex items-center justify-center shadow-lg bg-white/50 dark:bg-slate-800/50">
          {getIcon(content.icon)}
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          {content.title}
        </h3>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto px-4">
          {content.description}
        </p>
        {content.action && (
          <button
            onClick={content.action}
            className="mt-4 sm:mt-5 md:mt-6 glass-button bg-blue-600/90 hover:bg-blue-600 text-white font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg sm:rounded-xl transition-all shadow-lg hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2 text-sm sm:text-base"
            aria-label={content.actionLabel}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {content.actionLabel}
          </button>
        )}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export default EmptyState;