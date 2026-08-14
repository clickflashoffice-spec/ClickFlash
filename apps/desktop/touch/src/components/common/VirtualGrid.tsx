import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as ReactWindowModule from 'react-window';

const ReactWindow = ReactWindowModule as typeof import('react-window');
const FixedSizeGrid = ReactWindow.FixedSizeGrid || ReactWindow.default?.FixedSizeGrid;
import { logger } from '../../utils/logger';

interface VirtualGridProps<T> {
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

// Define the props for the child component of the Grid
interface GridChildComponentProps {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    data?: any;
    isScrolling?: boolean;
}

/**
 * Virtual grid component for rendering large lists efficiently
 * Only renders visible items, dramatically improving performance for 1000+ items
 * Automatically adjusts column count based on container width
 */
export function VirtualGrid<T>({
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

    // Validate numeric props - react-window requires valid numbers
    const containerHeight = typeof containerHeightProp === 'number' && !isNaN(containerHeightProp) && containerHeightProp > 0
        ? containerHeightProp
        : 600; // fallback

    const validItemWidth = typeof itemWidth === 'number' && !isNaN(itemWidth) && itemWidth > 0 ? itemWidth : 200;
    const validItemHeight = typeof itemHeight === 'number' && !isNaN(itemHeight) && itemHeight > 0 ? itemHeight : 200;
    const validGap = typeof gap === 'number' && !isNaN(gap) && gap >= 0 ? gap : 16;

    // ── All hooks must be called before any early returns (Rules of Hooks) ────
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

    // Calculate grid dimensions
    const gridDimensions = useMemo(() => {
        if (items.length === 0) return null;
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

    // Cell renderer — stable reference via useCallback (must be before early returns)
    const Cell = React.useCallback(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
        const safeStyle: React.CSSProperties = style && typeof style === 'object' && !Array.isArray(style)
            ? style
            : { position: 'absolute', top: 0, left: 0 };

        const dims = gridDimensions;
        if (!dims) return <div style={safeStyle} />;

        const index = rowIndex * dims.columnCount + columnIndex;
        if (index < 0 || index >= items.length) return <div style={safeStyle} />;

        const item = items[index];
        if (!item) return <div style={safeStyle} />;

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
            logger.error('Error rendering item in VirtualGrid', error instanceof Error ? error : undefined, {
                itemIndex: index,
                totalItems: items.length,
                columnIndex,
                rowIndex,
                gridColumnCount: dims.columnCount
            });
            return (
                <div style={itemStyle} className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <span className="text-xs text-red-600 dark:text-red-400">Error loading item</span>
                </div>
            );
        }
    }, [items, gridDimensions, validItemWidth, validItemHeight, validGap, renderItem]);

    // ── Early returns after all hooks ─────────────────────────────────────────
    if (items.length === 0) return null;
    if (!FixedSizeGrid || typeof FixedSizeGrid !== 'function') return null;
    if (!gridDimensions) return null;
    if (!renderItem || typeof renderItem !== 'function') return null;

    const safeWidth = actualWidth > 0 ? actualWidth : 800;
    const safeOverscan = typeof overscanCount === 'number' && overscanCount >= 0 ? overscanCount : 3;

    const finalColumnCount = Number(gridDimensions.columnCount);
    const finalColumnWidth = Number(gridDimensions.columnWidth);
    const finalHeight = Number(containerHeight);
    const finalRowCount = Number(gridDimensions.rowCount);
    const finalRowHeight = Number(gridDimensions.rowHeight);
    const finalWidth = Number(safeWidth);
    const finalOverscanRowCount = Number(safeOverscan);
    const finalOverscanColumnCount = Number(safeOverscan);

    if (
        isNaN(finalColumnCount) || finalColumnCount <= 0 ||
        isNaN(finalColumnWidth) || finalColumnWidth <= 0 ||
        isNaN(finalHeight) || finalHeight <= 0 ||
        isNaN(finalRowCount) || finalRowCount <= 0 ||
        isNaN(finalRowHeight) || finalRowHeight <= 0 ||
        isNaN(finalWidth) || finalWidth <= 0
    ) {
        return null;
    }

    try {
        return (
            <div ref={containerRef} style={{ width: containerWidth, height: containerHeight }}>
                <FixedSizeGrid
                    columnCount={finalColumnCount}
                    columnWidth={finalColumnWidth}
                    height={finalHeight}
                    rowCount={finalRowCount}
                    rowHeight={finalRowHeight}
                    width={finalWidth}
                    overscanRowCount={finalOverscanRowCount}
                    children={Cell as React.ComponentType<any>}
                />
            </div>
        );
    } catch (error) {
        logger.error('Error rendering react-window Grid', error instanceof Error ? error : undefined, {
            columnCount: finalColumnCount,
            rowCount: finalRowCount,
            width: finalWidth,
            height: finalHeight,
            itemCount: items.length,
            containerWidth: typeof containerWidth === 'number' ? containerWidth : '100%'
        });
        return null;
    }
}

export default VirtualGrid;
