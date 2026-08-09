import { PhotoCard } from '@clickflash/ui';
'use client';

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { Photo } from '@clickflash/types';

interface PhotoGridProps {
  photos: Photo[];
  onSelect?: (photo: Photo) => void;
  onPreview?: (photo: Photo) => void;
  selectedPhotoIds?: Set<string>;
  columns?: number;
  rowHeight?: number;
  gap?: number;
  className?: string;
}

export const PhotoGrid = memo<PhotoGridProps>(
  ({
    photos,
    onSelect,
    onPreview,
    selectedPhotoIds = new Set(),
    columns = 4,
    rowHeight = 280,
    gap = 16,
    className,
  }) => {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowCount = useMemo(() => Math.ceil(photos.length / columns), [photos.length, columns]);

    const rowVirtualizer = useVirtualizer({
      count: rowCount,
      getScrollElement: () => parentRef.current,
      estimateSize: () => rowHeight + gap,
      overscan: 3,
    });

    const getPhotosForRow = useCallback(
      (rowIndex: number) => {
        const start = rowIndex * columns;
        return photos.slice(start, start + columns);
      },
      [photos, columns]
    );

    return (
      <div
        ref={parentRef}
        className={`h-full overflow-auto ${className || ''}`}
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowPhotos = getPhotosForRow(virtualRow.index);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex gap-4 px-4"
              >
                {rowPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex-1 min-w-0"
                    style={{ height: rowHeight }}
                  >
                    <PhotoCard
                      photo={photo}
                      onSelect={onSelect}
                      onPreview={onPreview}
                      isSelected={selectedPhotoIds.has(photo.id)}
                      priority={virtualRow.index < 2}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

PhotoGrid.displayName = 'PhotoGrid';

export default PhotoGrid;