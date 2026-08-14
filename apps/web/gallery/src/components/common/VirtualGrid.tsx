import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Grid,
  type CellComponentProps,
} from 'react-window';

import { logger } from '@/utils/logger';

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

interface VirtualGridCellData<T> {
  items: T[];
  columnCount: number;
  itemWidth: number;
  itemHeight: number;
  gap: number;
  renderItem: VirtualGridProps<T>['renderItem'];
}

const normalizePositiveNumber = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const getVelocityAdjustedOverscan = (
  baseOverscan: number,
  velocityPixelsPerMillisecond: number,
): number => {
  const base = Math.max(0, Math.floor(Number.isFinite(baseOverscan) ? baseOverscan : 3));
  const velocity = Math.abs(
    Number.isFinite(velocityPixelsPerMillisecond) ? velocityPixelsPerMillisecond : 0,
  );

  if (velocity >= 2.5) return Math.min(24, Math.max(base, 12));
  if (velocity >= 0.8) return Math.min(24, Math.max(base, 6));
  return base;
};

/**
 * Module-level cell renderer. Keeping this outside VirtualGrid prevents a new
 * component type from being created during parent renders.
 */
function VirtualGridCell<T>({
  ariaAttributes,
  columnIndex,
  rowIndex,
  style,
  items,
  columnCount,
  itemWidth,
  itemHeight,
  gap,
  renderItem,
}: CellComponentProps<VirtualGridCellData<T>>): React.ReactElement | null {
  const index = rowIndex * columnCount + columnIndex;
  const item = items[index];

  if (item === undefined) return null;

  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    padding: gap / 2,
    boxSizing: 'border-box',
  };

  try {
    return (
      <div {...ariaAttributes} style={style}>
        <div style={contentStyle}>
          {renderItem(item, index, { width: itemWidth, height: itemHeight })}
        </div>
      </div>
    );
  } catch (error) {
    logger.error(
      'Error rendering item in VirtualGrid',
      error instanceof Error ? error : undefined,
      { itemIndex: index, columnIndex, rowIndex, columnCount },
    );
    return (
      <div {...ariaAttributes} style={style}>
        <div
          style={contentStyle}
          className="flex items-center justify-center rounded border border-red-800 bg-red-900/20"
        >
          <span className="text-xs text-red-400">Error loading item</span>
        </div>
      </div>
    );
  }
}

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
  maxColumns,
}: VirtualGridProps<T>): React.ReactElement | null {
  const items = itemsProp;
  const containerHeight = normalizePositiveNumber(containerHeightProp, 600);
  const validItemWidth = normalizePositiveNumber(itemWidth, 200);
  const validItemHeight = normalizePositiveNumber(itemHeight, 200);
  const validGap = Number.isFinite(gap) && gap >= 0 ? gap : 16;
  const baseOverscan = Math.max(
    0,
    Math.floor(Number.isFinite(overscanCount) ? overscanCount : 3),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef({ top: 0, timestamp: 0 });
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dynamicOverscan, setDynamicOverscan] = useState(baseOverscan);
  const [actualWidth, setActualWidth] = useState(() => {
    if (typeof containerWidth === 'number') {
      return normalizePositiveNumber(containerWidth, 800);
    }
    if (containerWidth !== '100%') {
      return normalizePositiveNumber(Number.parseInt(containerWidth, 10), 800);
    }
    return typeof window === 'undefined' ? 800 : window.innerWidth;
  });

  useEffect(() => {
    setDynamicOverscan(baseOverscan);
  }, [baseOverscan]);

  useEffect(() => {
    if (containerWidth !== '100%') return undefined;

    const updateWidth = () => {
      setActualWidth(containerRef.current?.offsetWidth || window.innerWidth || 800);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [containerWidth]);

  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
  }, []);

  const gridDimensions = useMemo(() => {
    const safeWidth = normalizePositiveNumber(actualWidth, 800);
    const availableWidth = Math.max(validItemWidth, safeWidth - validGap * 2);
    let columnCount = Math.max(
      Math.max(1, Math.floor(minColumns)),
      Math.floor(availableWidth / (validItemWidth + validGap)),
    );

    if (maxColumns && maxColumns > 0) {
      columnCount = Math.min(columnCount, Math.floor(maxColumns));
    }

    return {
      columnCount: Math.max(1, columnCount),
      rowCount: Math.max(1, Math.ceil(items.length / Math.max(1, columnCount))),
      columnWidth: validItemWidth + validGap,
      rowHeight: validItemHeight + validGap,
    };
  }, [actualWidth, items.length, maxColumns, minColumns, validGap, validItemHeight, validItemWidth]);

  const cellProps = useMemo<VirtualGridCellData<T>>(() => ({
    items,
    columnCount: gridDimensions.columnCount,
    itemWidth: validItemWidth,
    itemHeight: validItemHeight,
    gap: validGap,
    renderItem,
  }), [gridDimensions.columnCount, items, renderItem, validGap, validItemHeight, validItemWidth]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const now = performance.now();
    const top = event.currentTarget.scrollTop;
    const previous = lastScrollRef.current;
    const elapsed = now - previous.timestamp;
    const velocity = previous.timestamp > 0 && elapsed > 0
      ? Math.abs(top - previous.top) / elapsed
      : 0;

    lastScrollRef.current = { top, timestamp: now };
    const nextOverscan = getVelocityAdjustedOverscan(baseOverscan, velocity);
    setDynamicOverscan((current) => current === nextOverscan ? current : nextOverscan);

    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => setDynamicOverscan(baseOverscan), 140);
  }, [baseOverscan]);

  if (items.length === 0 || typeof renderItem !== 'function') return null;

  const safeWidth = normalizePositiveNumber(actualWidth, 800);

  return (
    <div ref={containerRef} style={{ width: containerWidth, height: containerHeight }}>
      <Grid
        cellComponent={VirtualGridCell<T>}
        cellProps={cellProps}
        columnCount={gridDimensions.columnCount}
        columnWidth={gridDimensions.columnWidth}
        rowCount={gridDimensions.rowCount}
        rowHeight={gridDimensions.rowHeight}
        overscanCount={dynamicOverscan}
        onScroll={handleScroll}
        style={{ width: safeWidth, height: containerHeight }}
      />
    </div>
  );
}

type VirtualGridComponent = {
  <T>(props: VirtualGridProps<T>): React.ReactElement | null;
  displayName?: string;
};

export const VirtualGrid = memo(VirtualGridInner) as VirtualGridComponent;
VirtualGrid.displayName = 'VirtualGrid';

export default VirtualGrid;
