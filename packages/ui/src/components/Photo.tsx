'use client';
import React, { memo, useMemo, useCallback } from 'react';
import type { Photo as PhotoType, ManualEdits } from '@clickflash/types';
import { getPhotoStyle } from '../utils/styleUtils';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PhotoProps {
  photo: PhotoType;
  manualEdits?: ManualEdits;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
  showWatermark?: boolean;
  priority?: boolean;
  extraTransform?: string;
  draggable?: boolean;
}

export const Photo = memo<PhotoProps>(({
  photo,
  manualEdits,
  className,
  imageClassName,
  style,
  showWatermark = true,
  priority = false,
  extraTransform = '',
  draggable = false,
}) => {
  const imageUrl = useMemo(() => {
    return showWatermark && photo.watermarkUrl ? photo.watermarkUrl : (photo.previewUrl || photo.url);
  }, [photo.url, photo.previewUrl, photo.watermarkUrl, showWatermark]);

  const editStyle = useMemo(() => {
    if (!manualEdits) return { filter: 'none', transform: 'none', transition: 'none' };
    return getPhotoStyle(manualEdits);
  }, [manualEdits]);

  const combinedTransform = [extraTransform, editStyle.transform]
    .filter(Boolean)
    .join(' ')
    .trim();

  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (!draggable) {
      e.preventDefault();
      return false;
    }
  }, [draggable]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  return (
    <div 
      className={twMerge(clsx('relative w-full h-full overflow-hidden', className))}
      style={style}
      onContextMenu={handleContextMenu}
    >
      {!draggable && (
        <div
          className="absolute inset-0 z-10 select-none"
          onDragStart={handleDragStart}
          draggable={false}
        />
      )}
      
      <img
        src={imageUrl}
        alt={photo.title || `Photo ${photo.id}`}
        className={twMerge(clsx(
          'w-full h-full object-cover max-h-full origin-center pointer-events-none',
          imageClassName
        ))}
        style={{
          filter: editStyle.filter,
          transform: combinedTransform || 'none',
          transition: editStyle.transition
        }}
        loading={priority ? 'eager' : 'lazy'}
        draggable={draggable}
      />

      {showWatermark && photo.watermarkUrl && (
        <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none opacity-20">
          <span className="text-4xl font-black text-white rotate-[-45deg] select-none uppercase tracking-tighter mix-blend-overlay shadow-sm">
            ClickFlash
          </span>
        </div>
      )}
    </div>
  );
});

Photo.displayName = 'Photo';
export default Photo;

