import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import { logger } from "../../utils/logger";

export interface VirtualGridProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerHeight: number;
  containerWidth?: number | string;
  gap?: number;
  renderItem: (
    item: T,
    index: number,
    style: React.CSSProperties,
  ) => React.ReactNode;
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
  containerWidth = "100%",
  gap = 16,
  renderItem,
  overscanCount = 3,
  minColumns = 1,
  maxColumns,
}: VirtualGridProps<T>) {
  // Ensure items is always a valid array
  const items = useMemo(() => (Array.isArray(itemsProp) ? itemsProp : []), [itemsProp]);

  // Validate numeric props - react-window requires valid positive numbers
  const containerHeight =
    typeof containerHeightProp === "number" &&
    isFinite(containerHeightProp) &&
    containerHeightProp > 0
      ? containerHeightProp
      : 600;

  const validItemWidth =
    typeof itemWidth === "number" && isFinite(itemWidth) && itemWidth > 0
      ? itemWidth
      : 200;
  const validItemHeight =
    typeof itemHeight === "number" && isFinite(itemHeight) && itemHeight > 0
      ? itemHeight
      : 200;
  const validGap =
    typeof gap === "number" && isFinite(gap) && gap >= 0 ? gap : 16;
  const safeOverscan =
    typeof overscanCount === "number" && isFinite(overscanCount) && overscanCount >= 0
      ? overscanCount
      : 3;

  // --- All hooks called unconditionally below ---

  const containerRef = useRef<HTMLDivElement>(null);
  const [actualWidth, setActualWidth] = useState(() => {
    if (typeof containerWidth === "string" && containerWidth === "100%") {
      return typeof window !== "undefined" ? window.innerWidth : 800;
    }
    if (typeof containerWidth === "string") {
      const parsed = parseInt(containerWidth);
      return isFinite(parsed) && parsed > 0 ? parsed : 800;
    }
    if (
      typeof containerWidth === "number" &&
      isFinite(containerWidth) &&
      containerWidth > 0
    ) {
      return containerWidth;
    }
    return 800;
  });

  // Update width on resize
  useEffect(() => {
    if (typeof containerWidth === "string" && containerWidth === "100%") {
      const updateWidth = () => {
        if (containerRef.current) {
          setActualWidth(containerRef.current.offsetWidth);
        } else {
          setActualWidth(window.innerWidth);
        }
      };

      updateWidth();
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, [containerWidth]);

  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    const safeWidth = actualWidth > 0 ? actualWidth : 800;
    const availableWidth = safeWidth - validGap * 2;
    let columnCount = Math.max(
      minColumns,
      Math.floor(availableWidth / (validItemWidth + validGap)),
    );

    if (maxColumns && maxColumns > 0) {
      columnCount = Math.min(columnCount, maxColumns);
    }

    const rowCount = Math.ceil(items.length / Math.max(1, columnCount));

    return {
      columnCount: Math.max(1, columnCount),
      rowCount: Math.max(1, rowCount),
      columnWidth: Math.max(1, validItemWidth + validGap),
      rowHeight: Math.max(1, validItemHeight + validGap),
    };
  }, [
    items.length,
    validItemWidth,
    validItemHeight,
    validGap,
    actualWidth,
    minColumns,
    maxColumns,
  ]);

  // Cell renderer - must be called unconditionally (React hook rules)
  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
      const safeStyle: React.CSSProperties =
        style && typeof style === "object" && !Array.isArray(style)
          ? style
          : { position: "absolute" as const, top: 0, left: 0 };

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
        padding: validGap / 2,
      };

      try {
        return (
          <div style={itemStyle}>
            {renderItem(item, index, {
              width: validItemWidth,
              height: validItemHeight,
            })}
          </div>
        );
      } catch (error) {
        logger.error(
          "Error rendering item in VirtualGrid",
          error instanceof Error ? error : undefined,
          {
            itemIndex: index,
            totalItems: items.length,
            columnIndex,
            rowIndex,
            gridColumnCount: gridDimensions.columnCount,
          },
        );
        return (
          <div
            style={itemStyle}
            className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"
          >
            <span className="text-xs text-red-600 dark:text-red-400">
              Error loading item
            </span>
          </div>
        );
      }
    },
    [items, gridDimensions, validItemWidth, validItemHeight, validGap, renderItem],
  );

  // --- All hooks called above. Guard returns below. ---

  if (items.length === 0) {
    return null;
  }

  if (!renderItem || typeof renderItem !== "function") {
    return null;
  }

  const safeWidth = actualWidth > 0 ? actualWidth : 800;

  try {
    return (
      <div
        ref={containerRef}
        style={{ width: containerWidth, height: containerHeight }}
      >
        <Grid
          columnCount={gridDimensions.columnCount}
          columnWidth={gridDimensions.columnWidth}
          height={containerHeight}
          rowCount={gridDimensions.rowCount}
          rowHeight={gridDimensions.rowHeight}
          width={safeWidth}
          overscanRowCount={safeOverscan}
          overscanColumnCount={safeOverscan}
        >
          {Cell}
        </Grid>
      </div>
    );
  } catch (error) {
    logger.error(
      "Error rendering react-window Grid",
      error instanceof Error ? error : undefined,
      {
        columnCount: gridDimensions.columnCount,
        rowCount: gridDimensions.rowCount,
        width: safeWidth,
        height: containerHeight,
        itemCount: items.length,
        containerWidth:
          typeof containerWidth === "number" ? containerWidth : "100%",
      },
    );
    return null;
  }
}

export const VirtualGrid = React.memo(VirtualGridInner) as <T>(
  props: VirtualGridProps<T>
) => React.ReactElement | null;

export default VirtualGrid;

(VirtualGrid as any).displayName = 'VirtualGrid';
