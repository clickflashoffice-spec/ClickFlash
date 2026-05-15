import React, { useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { logger } from "../../utils/logger";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  containerWidth?: number | string;
  renderItem: (
    item: T,
    index: number,
    style: React.CSSProperties,
  ) => React.ReactNode;
  overscanCount?: number;
}

/**
 * Virtual list component for rendering large lists efficiently
 * Only renders visible items, dramatically improving performance for 100+ items
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={orders}
 *   itemHeight={80}
 *   containerHeight={600}
 *   renderItem={(order, index, style) => (
 *     <div style={style}>
 *       <OrderRow order={order} />
 *     </div>
 *   )}
 * />
 * ```
 */
export function VirtualList<T>({
  items: itemsProp,
  itemHeight: itemHeightProp,
  containerHeight: containerHeightProp,
  containerWidth = "100%",
  renderItem,
  overscanCount = 5,
}: VirtualListProps<T>) {
  // Ensure items is always a valid array
  const items = Array.isArray(itemsProp) ? itemsProp : [];

  // Validate numeric props - react-window requires valid numbers
  const containerHeight =
    typeof containerHeightProp === "number" &&
    isFinite(containerHeightProp) &&
    containerHeightProp > 0
      ? containerHeightProp
      : 600;

  const validItemHeight =
    typeof itemHeightProp === "number" &&
    isFinite(itemHeightProp) &&
    itemHeightProp > 0
      ? itemHeightProp
      : 50;

  const safeOverscan =
    typeof overscanCount === "number" && isFinite(overscanCount) && overscanCount >= 0
      ? overscanCount
      : 5;

  const safeWidth =
    typeof containerWidth === "string"
      ? containerWidth
      : typeof containerWidth === "number" &&
          isFinite(containerWidth) &&
          containerWidth > 0
        ? containerWidth
        : "100%";

  // --- All hooks called unconditionally below ---

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const safeStyle: React.CSSProperties =
        style && typeof style === "object" && !Array.isArray(style)
          ? style
          : { position: "absolute" as const, top: 0, left: 0 };

      if (index < 0 || index >= items.length) {
        return <div style={safeStyle} />;
      }

      const item = items[index];
      if (!item) {
        return <div style={safeStyle} />;
      }

      try {
        return (
          <div style={safeStyle}>{renderItem(item, index, safeStyle)}</div>
        );
      } catch (error) {
        logger.error(
          "Error rendering item in VirtualList",
          error instanceof Error ? error : undefined,
          { itemIndex: index, totalItems: items.length },
        );
        return <div style={safeStyle} />;
      }
    },
    [items, renderItem],
  );

  // --- All hooks called above. Guard returns below. ---

  if (items.length === 0) {
    return null;
  }

  if (!renderItem || typeof renderItem !== "function") {
    return null;
  }

  try {
    return (
      <List
        height={containerHeight}
        itemCount={items.length}
        itemSize={validItemHeight}
        width={safeWidth}
        overscanCount={safeOverscan}
      >
        {Row}
      </List>
    );
  } catch (error) {
    logger.error(
      "Error rendering react-window List",
      error instanceof Error ? error : undefined,
      {
        height: containerHeight,
        itemCount: items.length,
        itemSize: validItemHeight,
      },
    );
    return null;
  }
}

export default VirtualList;
