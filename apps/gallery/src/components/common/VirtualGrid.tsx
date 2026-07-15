import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as ReactWindowModule from "react-window";
const ReactWindowAny = ReactWindowModule as any;
const FixedSizeGrid =
  ReactWindowAny.FixedSizeGrid ||
  ReactWindowAny.Grid ||
  ReactWindowAny.default?.FixedSizeGrid ||
  ReactWindowAny.default?.Grid;
import { logger } from '../../utils/logger';

export interface VirtualGridProps<T> {
    items: T[];
    itemWidth: number;
    itemHeight: number;
    containerHeight: number;
    containerWidth?: number | string;
    gap?: number;
    renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
    overscanCount?: number;
    minColumns?: number;
    maxColumns?: number;
}

/**
 * Virtual grid component for rendering large lists efficiently
 * Only renders visible items, dramatically improving performance for 1000+ items
 * Automatically adjusts column count based on container width
 * 
 * @example
 * ```tsx
 * <VirtualGrid
 *   items={photos}
 *   itemWidth={200}
 *   itemHeight={200}
 *   containerHeight={600}
 *   gap={16}
 *   renderItem={(photo, index, style) => (
 *     <div style={style}>
 *       <PhotoCard photo={photo} />
 *     </div>
 *   )}
 * />
 * ```
 */
function VirtualGridInner<T>({
    items: itemsProp,
    itemWidth,
    itemHeight,
    containerHeight: containerHeightProp,
    containerWidth = '100%',
    gap = 16,
    renderItem,
    overscanCount = 3,
    minColumns = 1,
    maxColumns
}: VirtualGridProps<T>) {
    // Ensure items is always a valid array
    const items = Array.isArray(itemsProp) ? itemsProp : [];
    
    // Early return if items is empty
    if (items.length === 0) {
        return null;
    }

    // Validate numeric props - react-window requires valid numbers
    const containerHeight = typeof containerHeightProp === 'number' && !isNaN(containerHeightProp) && containerHeightProp > 0 
        ? containerHeightProp 
        : 600; // fallback
    
    const validItemWidth = typeof itemWidth === 'number' && !isNaN(itemWidth) && itemWidth > 0 ? itemWidth : 200;
    const validItemHeight = typeof itemHeight === 'number' && !isNaN(itemHeight) && itemHeight > 0 ? itemHeight : 200;
    const validGap = typeof gap === 'number' && !isNaN(gap) && gap >= 0 ? gap : 16;

    const containerRef = useRef<HTMLDivElement>(null);
    const [actualWidth, setActualWidth] = useState(() => {
        if (typeof containerWidth === 'string' && containerWidth === '100%') {
            return typeof window !== 'undefined' ? window.innerWidth : 800;
        }
        if (typeof containerWidth === 'string') {
            const parsed = parseInt(containerWidth);
            return !isNaN(parsed) && parsed > 0 ? parsed : 800;
        }
        if (typeof containerWidth === 'number' && !isNaN(containerWidth) && containerWidth > 0) {
            return containerWidth;
        }
        return 800; // fallback
    });

    // Update width on resize
    useEffect(() => {
        if (typeof containerWidth === 'string' && containerWidth === '100%') {
            const updateWidth = () => {
                if (containerRef.current) {
                    setActualWidth(containerRef.current.offsetWidth);
                } else {
                    setActualWidth(window.innerWidth);
                }
            };
            
            updateWidth();
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, [containerWidth]);

    // Calculate grid dimensions - only runs when items is valid
    const gridDimensions = useMemo(() => {
        const safeWidth = actualWidth > 0 ? actualWidth : 800;
        const availableWidth = safeWidth - (validGap * 2); // Account for padding
        let columnCount = Math.max(minColumns, Math.floor(availableWidth / (validItemWidth + validGap)));
        
        if (maxColumns && maxColumns > 0) {
            columnCount = Math.min(columnCount, maxColumns);
        }
        
        const rowCount = Math.ceil(items.length / columnCount);
        
        return {
            columnCount: Math.max(1, columnCount),
            rowCount: Math.max(1, rowCount),
            columnWidth: Math.max(1, validItemWidth + validGap),
            rowHeight: Math.max(1, validItemHeight + validGap)
        };
    }, [items.length, validItemWidth, validItemHeight, validGap, actualWidth, minColumns, maxColumns]);

    // Ensure Grid component is available
    if (!FixedSizeGrid) {
        return null;
    }

    // Ensure all props are valid before rendering Grid
    if (!gridDimensions || 
        gridDimensions.columnCount <= 0 || 
        gridDimensions.rowCount <= 0 ||
        gridDimensions.columnWidth <= 0 ||
        gridDimensions.rowHeight <= 0) {
        return null;
    }

    if (!renderItem || typeof renderItem !== 'function') {
        return null;
    }

    const safeWidth = actualWidth > 0 ? actualWidth : 800;
    const safeOverscan = typeof overscanCount === 'number' && overscanCount >= 0 ? overscanCount : 3;

    // Build props object without undefined values to avoid react-window issues
    // React-window calls Object.values() internally and fails if any prop is undefined/null
    const gridProps: {
        columnCount: number;
        columnWidth: number;
        height: number;
        rowCount: number;
        rowHeight: number;
        width: number;
        overscanRowCount: number;
        overscanColumnCount: number;
    } = {
        columnCount: gridDimensions.columnCount,
        columnWidth: gridDimensions.columnWidth,
        height: containerHeight,
        rowCount: gridDimensions.rowCount,
        rowHeight: gridDimensions.rowHeight,
        width: safeWidth,
        overscanRowCount: safeOverscan,
        overscanColumnCount: safeOverscan
    };

    // Validate all props are valid numbers
    if (typeof gridProps.columnCount !== 'number' || isNaN(gridProps.columnCount) || gridProps.columnCount <= 0 ||
        typeof gridProps.columnWidth !== 'number' || isNaN(gridProps.columnWidth) || gridProps.columnWidth <= 0 ||
        typeof gridProps.height !== 'number' || isNaN(gridProps.height) || gridProps.height <= 0 ||
        typeof gridProps.rowCount !== 'number' || isNaN(gridProps.rowCount) || gridProps.rowCount <= 0 ||
        typeof gridProps.rowHeight !== 'number' || isNaN(gridProps.rowHeight) || gridProps.rowHeight <= 0 ||
        typeof gridProps.width !== 'number' || isNaN(gridProps.width) || gridProps.width <= 0 ||
        typeof gridProps.overscanRowCount !== 'number' || isNaN(gridProps.overscanRowCount) || gridProps.overscanRowCount < 0 ||
        typeof gridProps.overscanColumnCount !== 'number' || isNaN(gridProps.overscanColumnCount) || gridProps.overscanColumnCount < 0) {
        return null;
    }

    // Create a clean props object and validate no undefined/null values exist
    // React-window will fail on Object.values() if any prop values are undefined/null
    const cleanProps = {
        columnCount: gridProps.columnCount,
        columnWidth: gridProps.columnWidth,
        height: gridProps.height,
        rowCount: gridProps.rowCount,
        rowHeight: gridProps.rowHeight,
        width: gridProps.width,
        overscanRowCount: gridProps.overscanRowCount,
        overscanColumnCount: gridProps.overscanColumnCount
    };
    
    // Final validation - ensure no undefined/null values (react-window calls Object.values() internally)
    const propValues = Object.values(cleanProps);
    if (propValues.some(val => val === undefined || val === null || (typeof val === 'number' && isNaN(val)))) {
        return null;
    }

    // Define Cell component as a stable function reference
    const Cell = React.useCallback(({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
        // Ensure style is always a valid object
        const safeStyle: React.CSSProperties = style && typeof style === 'object' && !Array.isArray(style) 
            ? style 
            : { position: 'absolute', top: 0, left: 0 };

        const index = rowIndex * gridDimensions.columnCount + columnIndex;
        
        if (index < 0 || index >= items.length) {
            return <div style={safeStyle} />;
        }

        const item = items[index];
        if (!item) {
            return <div style={safeStyle} />;
        }

        const itemStyle: React.CSSProperties = {
            ...safeStyle,
            width: validItemWidth,
            height: validItemHeight,
            padding: validGap / 2
        };

        try {
            return (
                <div style={itemStyle}>
                    {renderItem(item, index, { width: validItemWidth, height: validItemHeight })}
                </div>
            );
        } catch (error) {
            // Log error with context for debugging
            logger.error('Error rendering item in VirtualGrid', error instanceof Error ? error : undefined, {
                itemIndex: index,
                totalItems: items.length,
                columnIndex,
                rowIndex,
                gridColumnCount: gridDimensions.columnCount
            });
            // Return empty div to prevent crash, but log the error
            return (
                <div style={itemStyle} className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <span className="text-xs text-red-600 dark:text-red-400">Error loading item</span>
                </div>
            );
        }
    }, [items, gridDimensions, validItemWidth, validItemHeight, validGap, renderItem]);

    // Final validation that Cell is a function
    if (typeof Cell !== 'function') {
        return null;
    }

    // Validate all source values before conversion to catch any undefined/null
    if (cleanProps.columnCount === undefined || cleanProps.columnCount === null ||
        cleanProps.columnWidth === undefined || cleanProps.columnWidth === null ||
        cleanProps.height === undefined || cleanProps.height === null ||
        cleanProps.rowCount === undefined || cleanProps.rowCount === null ||
        cleanProps.rowHeight === undefined || cleanProps.rowHeight === null ||
        cleanProps.width === undefined || cleanProps.width === null ||
        cleanProps.overscanRowCount === undefined || cleanProps.overscanRowCount === null ||
        cleanProps.overscanColumnCount === undefined || cleanProps.overscanColumnCount === null) {
        return null;
    }

    // Ensure cleanProps is a valid object before passing to react-window
    // React-window calls Object.values() internally, so the props object itself must be valid
    if (!cleanProps || typeof cleanProps !== 'object' || Array.isArray(cleanProps)) {
        return null;
    }

    // Wrap in try-catch to handle any react-window internal errors
    try {
        // Explicitly pass all props to avoid any undefined values from spread
        // React-window internally calls Object.values() on props, so we must ensure
        // all values are defined and not null. Convert to numbers explicitly.
        const finalColumnCount = Number(cleanProps.columnCount);
        const finalColumnWidth = Number(cleanProps.columnWidth);
        const finalHeight = Number(cleanProps.height);
        const finalRowCount = Number(cleanProps.rowCount);
        const finalRowHeight = Number(cleanProps.rowHeight);
        const finalWidth = Number(cleanProps.width);
        const finalOverscanRowCount = Number(cleanProps.overscanRowCount);
        const finalOverscanColumnCount = Number(cleanProps.overscanColumnCount);
        
        // Final validation - ensure no NaN or invalid values
        if (isNaN(finalColumnCount) || !isFinite(finalColumnCount) || finalColumnCount <= 0 ||
            isNaN(finalColumnWidth) || !isFinite(finalColumnWidth) || finalColumnWidth <= 0 ||
            isNaN(finalHeight) || !isFinite(finalHeight) || finalHeight <= 0 ||
            isNaN(finalRowCount) || !isFinite(finalRowCount) || finalRowCount <= 0 ||
            isNaN(finalRowHeight) || !isFinite(finalRowHeight) || finalRowHeight <= 0 ||
            isNaN(finalWidth) || !isFinite(finalWidth) || finalWidth <= 0 ||
            isNaN(finalOverscanRowCount) || !isFinite(finalOverscanRowCount) || finalOverscanRowCount < 0 ||
            isNaN(finalOverscanColumnCount) || !isFinite(finalOverscanColumnCount) || finalOverscanColumnCount < 0) {
            return null;
        }
        
        return (
            <div ref={containerRef} style={{ width: containerWidth, height: containerHeight }}>
                <FixedSizeGrid
                    columnCount={finalColumnCount}
                    columnWidth={finalColumnWidth}
                    rowCount={finalRowCount}
                    rowHeight={finalRowHeight}
                    height={finalHeight}
                    width={finalWidth}
                    overscanRowCount={finalOverscanRowCount}
                    overscanColumnCount={finalOverscanColumnCount}
                >
                    {Cell}
                </FixedSizeGrid>
            </div>
        );
                    } catch (error) {
                        // Log error with full context for debugging
                        logger.error('Error rendering react-window Grid', error instanceof Error ? error : undefined, {
                            columnCount: cleanProps.columnCount,
                            rowCount: cleanProps.rowCount,
                            width: cleanProps.width,
                            height: cleanProps.height,
                            itemCount: items.length,
                            containerWidth: typeof containerWidth === 'number' ? containerWidth : '100%'
                        });
                        return null;
                    }
}

export const VirtualGrid = React.memo(VirtualGridInner) as <T>(
  props: VirtualGridProps<T>
) => React.ReactElement | null;

export default VirtualGrid;
