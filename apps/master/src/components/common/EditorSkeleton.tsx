import React from 'react';

export const EditorSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50" role="status" aria-label="Loading editor">
      {/* Toolbar Skeleton */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-20 h-8 bg-gray-200 rounded"></div>
          <div className="w-32 h-6 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-8 bg-gray-200 rounded"></div>
          <div className="w-20 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-80 bg-white border-r border-gray-200 animate-pulse hidden lg:block">
          <div className="p-4 space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>

        {/* Canvas Skeleton */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-96 h-96 bg-gray-200 rounded-lg flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filmstrip Skeleton */}
      <div className="h-32 bg-white border-t border-gray-200 p-4 animate-pulse">
        <div className="flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-24 h-24 bg-gray-200 rounded flex-shrink-0"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EditorSkeleton;
