import React from "react";
import * as ReactWindowModule from "react-window";
const ReactWindowAny = ReactWindowModule as any;
const List =
  ReactWindowAny.FixedSizeList ||
  ReactWindowAny.List ||
  ReactWindowAny.default?.FixedSizeList ||
  ReactWindowAny.default?.List;

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
  // Ensure items is always a valid array - computed before hooks
  const isValidItems = Array.isArray(itemsProp) && itemsProp.length > 0;
  const items = isValidItems ? itemsProp : [];

  // Hook MUST be called unconditionally per Rules of Hooks
  const Row = React.useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const safeStyle: React.CSSProperties =
        style && typeof style === "object" && !Array.isArray(style)
          ? style
          : { position: "absolute", top: 0, left: 0 };

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
        console.error("Error rendering item in VirtualList:", error);
        return <div style={safeStyle} />;
      }
    },
    [items, renderItem],
  );

  // LATE VALIDATION - All validation AFTER hooks to maintain Rules of Hooks compliance
  if (!isValidItems) {
    return null;
  }

  if (!List || typeof List !== "object") {
    console.warn("VirtualList: FixedSizeList not found in react-window module");
    return null;
  }

  if (!renderItem || typeof renderItem !== "function") {
    return null;
  }

  const effectiveContainerHeight =
    typeof containerHeightProp === "number" &&
    !isNaN(containerHeightProp) &&
    containerHeightProp > 0
      ? containerHeightProp
      : 600;

  const effectiveItemHeight =
    typeof itemHeightProp === "number" &&
    !isNaN(itemHeightProp) &&
    itemHeightProp > 0
      ? itemHeightProp
      : 50;

  const effectiveOverscan =
    typeof overscanCount === "number" && overscanCount >= 0 ? overscanCount : 5;

  const effectiveWidth =
    typeof containerWidth === "string"
      ? containerWidth
      : typeof containerWidth === "number" &&
          !isNaN(containerWidth) &&
          containerWidth > 0
        ? containerWidth
        : "100%";

  const listProps = {
    height: effectiveContainerHeight,
    itemCount: items.length,
    itemSize: effectiveItemHeight,
    width: effectiveWidth,
    overscanCount: effectiveOverscan,
  };

  if (
    typeof listProps.height !== "number" ||
    isNaN(listProps.height) ||
    listProps.height <= 0 ||
    typeof listProps.itemCount !== "number" ||
    isNaN(listProps.itemCount) ||
    listProps.itemCount < 0 ||
    typeof listProps.itemSize !== "number" ||
    isNaN(listProps.itemSize) ||
    listProps.itemSize <= 0 ||
    typeof listProps.overscanCount !== "number" ||
    isNaN(listProps.overscanCount) ||
    listProps.overscanCount < 0
  ) {
    return null;
  }

  if (typeof Row !== "function") {
    return null;
  }

  try {
    const ListComponent = List as any;
    return (
      <ListComponent
        height={listProps.height}
        itemCount={listProps.itemCount}
        itemSize={listProps.itemSize}
        width={listProps.width}
        overscanCount={listProps.overscanCount}
      >
        {Row}
      </ListComponent>
    );
  } catch (error) {
    console.error("Error rendering react-window List:", error);
    return null;
  }
}

export default VirtualList;
