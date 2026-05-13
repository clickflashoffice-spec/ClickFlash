import React from "react";
import { FixedSizeList as List } from "react-window";

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

  // Early return if items is empty
  if (items.length === 0) {
    return null;
  }

  // Validate numeric props - react-window requires valid numbers
  const containerHeight =
    typeof containerHeightProp === "number" &&
    !isNaN(containerHeightProp) &&
    containerHeightProp > 0
      ? containerHeightProp
      : 600; // fallback

  const validItemHeight =
    typeof itemHeightProp === "number" &&
    !isNaN(itemHeightProp) &&
    itemHeightProp > 0
      ? itemHeightProp
      : 50; // fallback

  const safeOverscan =
    typeof overscanCount === "number" && overscanCount >= 0 ? overscanCount : 5;

  // Determine width value
  const safeWidth =
    typeof containerWidth === "string"
      ? containerWidth
      : typeof containerWidth === "number" &&
          !isNaN(containerWidth) &&
          containerWidth > 0
        ? containerWidth
        : "100%";

  // Ensure all props are valid before rendering List
  if (!renderItem || typeof renderItem !== "function") {
    return null;
  }

  // Build props object without undefined values to avoid react-window issues
  // React-window calls Object.values() internally and fails if any prop is undefined/null
  const listProps: {
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    overscanCount: number;
  } = {
    height: containerHeight,
    itemCount: items.length,
    itemSize: validItemHeight,
    width: safeWidth,
    overscanCount: safeOverscan,
  };

  // Validate all props are valid numbers/values
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

  // Create a clean props object and validate no undefined/null values exist
  // React-window will fail on Object.values() if any prop values are undefined/null
  const cleanProps = {
    height: listProps.height,
    itemCount: listProps.itemCount,
    itemSize: listProps.itemSize,
    width: listProps.width,
    overscanCount: listProps.overscanCount,
  };

  // Final validation - ensure no undefined/null values (react-window calls Object.values() internally)
  const propValues = Object.values(cleanProps);
  if (
    propValues.some(
      (val) =>
        val === undefined ||
        val === null ||
        (typeof val === "number" && isNaN(val)),
    )
  ) {
    return null;
  }

  // Define Row component as a stable function reference
  const Row = React.useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      // Ensure style is always a valid object
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

  // Final validation that Row is a function
  if (typeof Row !== "function") {
    return null;
  }

  // Ensure cleanProps is a valid object before passing to react-window
  if (
    !cleanProps ||
    typeof cleanProps !== "object" ||
    Array.isArray(cleanProps)
  ) {
    return null;
  }

  // Wrap in try-catch to handle any react-window internal errors
  try {
    // Explicitly pass props to avoid any spread operator issues
    // React-window internally calls Object.values() on props, so we must ensure
    // the props object itself is never undefined/null
    return (
      <List
        height={cleanProps.height}
        itemCount={cleanProps.itemCount}
        itemSize={cleanProps.itemSize}
        width={cleanProps.width}
        overscanCount={cleanProps.overscanCount}
      >
        {Row}
      </List>
    );
  } catch (error) {
    console.error("Error rendering react-window List:", error);
    return null;
  }
}

export default VirtualList;
