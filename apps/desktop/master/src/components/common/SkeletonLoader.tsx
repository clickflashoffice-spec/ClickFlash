import React from 'react';

/**
 * Skeleton Loader Component
 * Provides loading placeholders for better UX during data fetching
 */

interface SkeletonLoaderProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'photo';
    width?: number | string;
    height?: number | string;
    className?: string;
    count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'rectangular',
    width,
    height,
    className = '',
    count = 1
}) => {
    const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-700 rounded";
    
    const variantClasses = {
        text: "h-4",
        circular: "rounded-full",
        rectangular: "",
        photo: "aspect-square"
    };

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    if (count > 1) {
        return (
            <>
                {Array.from({ length: count }).map((_, index) => (
                    <div
                        key={index}
                        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
                        style={style}
                        aria-label="Loading..."
                        role="status"
                    />
                ))}
            </>
        );
    }

    return (
        <div
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
            aria-label="Loading..."
            role="status"
        />
    );
};

/**
 * Photo Grid Skeleton
 * Pre-configured skeleton for photo grids
 */
export const PhotoGridSkeleton: React.FC<{ count?: number; columns?: number }> = ({ 
    count = 12, 
    columns = 4 
}) => {
    return (
        <div className={`grid grid-cols-${columns} gap-4`}>
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonLoader
                    key={index}
                    variant="photo"
                    className="w-full aspect-square"
                />
            ))}
        </div>
    );
};

export default SkeletonLoader;

