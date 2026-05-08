'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Photo } from '@clickflash/types';

interface PhotoCardProps {
  photo: Photo;
  onSelect?: (photo: Photo) => void;
  onPreview?: (photo: Photo) => void;
  isSelected?: boolean;
  showWatermark?: boolean;
  className?: string;
  priority?: boolean;
}

export const PhotoCard = memo<PhotoCardProps>(
  ({
    photo,
    onSelect,
    onPreview,
    isSelected = false,
    showWatermark = true,
    className,
    priority = false,
  }) => {
    // Law 16: Strict anti-steal protection
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      return false;
    }, []);

    const handleDragStart = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      return false;
    }, []);

    const handleSelect = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(photo);
    }, [onSelect, photo]);

    const handlePreview = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onPreview?.(photo);
    }, [onPreview, photo]);

    const imageUrl = useMemo(() => {
      // Prioritize watermarkUrl in selection/gallery mode to prevent screenshots
      return showWatermark && photo.watermarkUrl ? photo.watermarkUrl : (photo.previewUrl || photo.url);
    }, [photo.url, photo.previewUrl, photo.watermarkUrl, showWatermark]);

    const aspectRatio = useMemo(() => {
      if (photo.width && photo.height && photo.height > 0) {
        return photo.width / photo.height;
      }
      return 3 / 2; // Standard photography default
    }, [photo.width, photo.height]);

    return (
      <div
        className={twMerge(
          clsx(
            'relative group cursor-pointer overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800',
            'border-2 transition-all duration-500 ease-in-out',
            isSelected
              ? 'border-blue-500 shadow-2xl shadow-blue-500/20 scale-[0.98]'
              : 'border-transparent hover:border-white/50 hover:shadow-xl hover:shadow-black/10',
            className
          )
        )}
        style={{ aspectRatio }}
        onClick={handleSelect}
        onDoubleClick={handlePreview}
        onContextMenu={handleContextMenu}
      >
        {/* Anti-Steal Overlay (Zero-latency interaction blocker) */}
        <div
          className="absolute inset-0 z-10 select-none"
          onDragStart={handleDragStart}
          draggable={false}
        />

        <div className="absolute inset-0">
          <img
            src={imageUrl}
            alt={photo.title || `Photo ${photo.id}`}
            className={clsx(
              'absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out',
              'group-hover:scale-110 group-hover:rotate-1',
              isSelected ? 'brightness-75' : 'brightness-100'
            )}
            loading={priority ? 'eager' : 'lazy'}
            draggable={false}
          />
        </div>

        {/* Premium Status Overlays */}
        <div className="absolute inset-0 z-20 pointer-events-none p-3 flex flex-col justify-between">
          <div className="flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {photo.cullingStatus && (
              <div
                className={clsx(
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/20',
                  photo.cullingStatus === 'Selected' && 'bg-emerald-500/80 text-white',
                  photo.cullingStatus === 'Rejected' && 'bg-red-500/80 text-white',
                  photo.cullingStatus === 'Pending' && 'bg-amber-500/80 text-white'
                )}
              >
                {photo.cullingStatus}
              </div>
            )}
            
            {isSelected && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end">
             {photo.proofingStatus && (
              <div
                className={clsx(
                  'px-3 py-1 rounded-lg text-[10px] font-black uppercase backdrop-blur-md border border-white/10',
                  photo.proofingStatus === 'approved' && 'bg-emerald-500/60 text-white',
                  photo.proofingStatus === 'rejected' && 'bg-red-500/60 text-white',
                  photo.proofingStatus === 'pending' && 'bg-amber-500/60 text-white'
                )}
              >
                {photo.proofingStatus}
              </div>
            )}

            {photo.resolution && (
              <div className="bg-black/40 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/80 font-mono">
                {Math.round(photo.resolution / 1000000)}MP
              </div>
            )}
          </div>
        </div>

        {/* Selection Glow Effect */}
        {isSelected && (
           <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
        )}

        {/* Watermark Protection Label (Subtle) */}
        {showWatermark && photo.watermarkUrl && (
          <div className="absolute inset-0 z-15 flex items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
            <span className="text-4xl font-black text-white rotate-[-45deg] select-none uppercase tracking-tighter">
              ClickFlash
            </span>
          </div>
        )}
      </div>
    );
  }
);

PhotoCard.displayName = 'PhotoCard';

export default PhotoCard;