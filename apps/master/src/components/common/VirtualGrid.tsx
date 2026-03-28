import React, { useMemo, useState, useEffect, useRef } from "react";
import * as ReactWindowModule from "react-window";
const ReactWindowAny = ReactWindowModule as any;
const Grid =
  ReactWindowAny.FixedSizeGrid ||
  ReactWindowAny.Grid ||
  ReactWindowAny.default?.FixedSizeGrid ||
  ReactWindowAny.default?.Grid;
import { logger } from "../../utils/logger";

interface VirtualGridProps<T> {
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
export function VirtualGrid<T>({
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
  // Compute validity upfront - hooks must always be called in same order per Rules of Hooks
  const isValidItems =
    itemsProp && Array.isArray(itemsProp) && itemsProp.length > 0;
  const effectiveItems = isValidItems ? itemsProp : [];

  // ALL hooks MUST be called unconditionally - this is critical for Rules of Hooks compliance
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualWidth, setActualWidth] = useState(() => {
    if (typeof containerWidth === "string" && containerWidth === "100%") {
      return typeof window !== "undefined" ? window.innerWidth : 800;
    }
    if (typeof containerWidth === "string") {
      const parsed = parseInt(containerWidth);
      return !isNaN(parsed) && parsed > 0 ? parsed : 800;
    }
    if (
      typeof containerWidth === "number" &&
      !isNaN(containerWidth) &&
      containerWidth > 0
    ) {
      return containerWidth;
    }
    return 800;
  });

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

  // Validate numeric props after hooks
  const effectiveContainerHeight =
    typeof containerHeightProp === "number" &&
    !isNaN(containerHeightProp) &&
    containerHeightProp > 0
      ? containerHeightProp
      : 600;
  const effectiveItemWidth =
    typeof itemWidth === "number" && !isNaN(itemWidth) && itemWidth > 0
      ? itemWidth
      : 200;
  const effectiveItemHeight =
    typeof itemHeight === "number" && !isNaN(itemHeight) && itemHeight > 0
      ? itemHeight
      : 200;
  const effectiveGap =
    typeof gap === "number" && !isNaN(gap) && gap >= 0 ? gap : 16;

  const gridDimensions = useMemo(() => {
    const safeWidth = actualWidth > 0 ? actualWidth : 800;
    const availableWidth = safeWidth - effectiveGap * 2;
    let columnCount = Math.max(
      minColumns,
      Math.floor(availableWidth / (effectiveItemWidth + effectiveGap)),
    );

    if (maxColumns && maxColumns > 0) {
      columnCount = Math.min(columnCount, maxColumns);
    }

    const rowCount = Math.ceil(effectiveItems.length / columnCount);

    return {
      columnCount: Math.max(1, columnCount),
      rowCount: Math.max(1, rowCount),
      columnWidth: Math.max(1, effectiveItemWidth + effectiveGap),
      rowHeight: Math.max(1, effectiveItemHeight + effectiveGap),
    };
  }, [
    effectiveItems.length,
    effectiveItemWidth,
    effectiveItemHeight,
    effectiveGap,
    actualWidth,
    minColumns,
    maxColumns,
  ]);

  const Cell = React.useCallback(
    ({
      columnIndex,
      rowIndex,
      style,
    }: {
      columnIndex: number;
      rowIndex: number;
      style: React.CSSProperties;
    }) => {
      const safeStyle: React.CSSProperties =
        style && typeof style === "object" && !Array.isArray(style)
          ? style
          : { position: "absolute", top: 0, left: 0 };

      const index = rowIndex * gridDimensions.columnCount + columnIndex;

      if (index < 0 || index >= effectiveItems.length) {
        return <div style={safeStyle} />;
      }

      const item = effectiveItems[index];
      if (!item) {
        return <div style={safeStyle} />;
      }

      const itemStyle: React.CSSProperties = {
        ...safeStyle,
        width: effectiveItemWidth,
        height: effectiveItemHeight,
        padding: effectiveGap / 2,
      };

      try {
        return (
          <div style={itemStyle}>
            {renderItem(item, index, {
              width: effectiveItemWidth,
              height: effectiveItemHeight,
            })}
          </div>
        );
      } catch (error) {
        logger.error(
          "Error rendering item in VirtualGrid",
          error instanceof Error ? error : undefined,
          {
            itemIndex: index,
            totalItems: effectiveItems.length,
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
    [
      effectiveItems,
      gridDimensions,
      effectiveItemWidth,
      effectiveItemHeight,
      effectiveGap,
      renderItem,
    ],
  );

  // LATE VALIDATION - After all hooks are called, we can return null if invalid
  if (!isValidItems) {
    return null;
  }

  if (!Grid || typeof Grid !== "function") {
    return null;
  }

  if (
    !gridDimensions ||
    gridDimensions.columnCount <= 0 ||
    gridDimensions.rowCount <= 0 ||
    gridDimensions.columnWidth <= 0 ||
    gridDimensions.rowHeight <= 0
  ) {
    return null;
  }

  if (!renderItem || typeof renderItem !== "function") {
    return null;
  }

  const safeWidth = actualWidth > 0 ? actualWidth : 800;
  const safeOverscan =
    typeof overscanCount === "number" && overscanCount >= 0 ? overscanCount : 3;

  const gridProps = {
    columnCount: gridDimensions.columnCount,
    columnWidth: gridDimensions.columnWidth,
    height: effectiveContainerHeight,
    rowCount: gridDimensions.rowCount,
    rowHeight: gridDimensions.rowHeight,
    width: safeWidth,
    overscanRowCount: safeOverscan,
    overscanColumnCount: safeOverscan,
  };

  if (
    typeof gridProps.columnCount !== "number" ||
    isNaN(gridProps.columnCount) ||
    gridProps.columnCount <= 0 ||
    typeof gridProps.columnWidth !== "number" ||
    isNaN(gridProps.columnWidth) ||
    gridProps.columnWidth <= 0 ||
    typeof gridProps.height !== "number" ||
    isNaN(gridProps.height) ||
    gridProps.height <= 0 ||
    typeof gridProps.rowCount !== "number" ||
    isNaN(gridProps.rowCount) ||
    gridProps.rowCount <= 0 ||
    typeof gridProps.rowHeight !== "number" ||
    isNaN(gridProps.rowHeight) ||
    gridProps.rowHeight <= 0 ||
    typeof gridProps.width !== "number" ||
    isNaN(gridProps.width) ||
    gridProps.width <= 0 ||
    typeof gridProps.overscanRowCount !== "number" ||
    isNaN(gridProps.overscanRowCount) ||
    gridProps.overscanRowCount < 0 ||
    typeof gridProps.overscanColumnCount !== "number" ||
    isNaN(gridProps.overscanColumnCount) ||
    gridProps.overscanColumnCount < 0
  ) {
    return null;
  }

  if (typeof Cell !== "function") {
    return null;
  }

  try {
    const GridComponent = Grid as any;
    return (
      <div
        ref={containerRef}
        style={{ width: containerWidth, height: containerHeightProp }}
      >
        <GridComponent
          columnCount={Number(gridProps.columnCount)}
          columnWidth={Number(gridProps.columnWidth)}
          height={Number(gridProps.height)}
          rowCount={Number(gridProps.rowCount)}
          rowHeight={Number(gridProps.rowHeight)}
          width={Number(gridProps.width)}
          overscanRowCount={Number(gridProps.overscanRowCount)}
          overscanColumnCount={Number(gridProps.overscanColumnCount)}
        >
          {Cell}
        </GridComponent>
      </div>
    );
  } catch (error) {
    logger.error(
      "Error rendering react-window Grid",
      error instanceof Error ? error : undefined,
      {
        columnCount: gridProps.columnCount,
        rowCount: gridProps.rowCount,
        width: gridProps.width,
        height: gridProps.height,
        itemCount: effectiveItems.length,
        containerWidth:
          typeof containerWidth === "number" ? containerWidth : "100%",
      },
    );
    return null;
  }
}

export default VirtualGrid;
