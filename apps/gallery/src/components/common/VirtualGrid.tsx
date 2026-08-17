import React, { useRef, useState, useEffect } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  itemWidth?: number;
  itemHeight?: number;
  containerHeight?: number;
  containerWidth?: number | string;
  gap?: number;
  renderItem: (item: T, index: number, style?: React.CSSProperties) => React.ReactNode;
  overscanCount?: number;
  minColumns?: number;
  maxColumns?: number;
  className?: string;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  gap = 16,
  className = ''
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const updateColumns = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      if (width < 640) setColumns(1);
      else if (width < 1024) setColumns(2);
      else if (width < 1440) setColumns(3);
      else setColumns(4);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`grid gap-4 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`
      }}
    >
      {items.map((item, index) => (
        <div key={index} className="w-full">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

export default VirtualGrid;
