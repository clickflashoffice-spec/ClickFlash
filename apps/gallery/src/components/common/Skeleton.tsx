import React from 'react';
import Card from './Card';

/**
 * Base skeleton component with pulse animation
 */
const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
);

/**
 * Album Card Skeleton - matches AlbumCard layout
 */
export const AlbumCardSkeleton: React.FC = () => (
  <div className="relative rounded-2xl overflow-hidden border bg-white dark:bg-slate-800 shadow-sm">
    {/* Image placeholder */}
    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
      <SkeletonBase className="w-full h-full" />
    </div>
    
    {/* Content area */}
    <div className="p-4">
      {/* Title */}
      <div className="flex justify-between items-start mb-2">
        <SkeletonBase className="h-5 w-3/4" />
        <SkeletonBase className="h-4 w-4 rounded-full" />
      </div>
      
      {/* Footer info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <SkeletonBase className="h-4 w-16 rounded-full" />
        <SkeletonBase className="h-4 w-24" />
      </div>
    </div>
  </div>
);

/**
 * Order Card Skeleton - matches Order card layout
 */
export const OrderCardSkeleton: React.FC = () => (
  <Card className="p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <SkeletonBase className="h-5 w-32 mb-2" />
        <SkeletonBase className="h-4 w-24 mb-1" />
        <SkeletonBase className="h-4 w-40" />
      </div>
      <SkeletonBase className="h-6 w-20 rounded-full" />
    </div>
    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
      <SkeletonBase className="h-4 w-16" />
      <SkeletonBase className="h-5 w-24" />
    </div>
  </Card>
);

/**
 * Dashboard Stat Card Skeleton
 */
export const StatCardSkeleton: React.FC = () => (
  <Card className="flex items-start space-x-4">
    <SkeletonBase className="h-12 w-12 rounded-lg" />
    <div className="flex-1">
      <SkeletonBase className="h-4 w-24 mb-2" />
      <SkeletonBase className="h-8 w-32" />
    </div>
  </Card>
);

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <tr>
    {[...Array(columns)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <SkeletonBase className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

/**
 * List Item Skeleton
 */
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center space-x-3 p-3 border-b border-slate-100 dark:border-slate-700">
    <SkeletonBase className="h-12 w-12 rounded-full" />
    <div className="flex-1">
      <SkeletonBase className="h-4 w-32 mb-2" />
      <SkeletonBase className="h-3 w-24" />
    </div>
    <SkeletonBase className="h-8 w-20 rounded-md" />
  </div>
);

/**
 * Photo Grid Skeleton
 */
export const PhotoGridSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="aspect-square">
        <SkeletonBase className="w-full h-full rounded-lg" />
      </div>
    ))}
  </div>
);

/**
 * Generic skeleton for custom layouts
 */
export const Skeleton: React.FC<{ className?: string; width?: string; height?: string }> = ({ 
  className = '', 
  width = '100%', 
  height = '1rem' 
}) => (
  <SkeletonBase className={className} style={{ width, height }} />
);

export default Skeleton;

