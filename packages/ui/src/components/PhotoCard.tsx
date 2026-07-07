'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Photo as PhotoType } from '@clickflash/types';
import Photo from './Photo';

interface PhotoCardProps {
  photo: PhotoType;
  onSelect?: (photo: PhotoType) => void;
  onPreview?: (photo: PhotoType) => void;
  isSelected?: boolean;
  showWatermark?: boolean;
  className?: string;
  priority?: boolean;
  children?: React.ReactNode;
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
    children
  }) => {
    const handleSelect = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(photo);
    }, [onSelect, photo]);

    const handlePreview = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onPreview?.(photo);
    }, [onPreview, photo]);

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
      >
        <div className="absolute inset-0">
          <Photo
            photo={photo}
            manualEdits={photo.manualEdits || undefined}
            showWatermark={showWatermark}
            priority={priority}
            imageClassName={clsx(
              'group-hover:scale-110 group-hover:rotate-1',
              isSelected ? 'brightness-75' : 'brightness-100'
            )}
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

        {children}
      </div>
    );
  }
);

PhotoCard.displayName = 'PhotoCard';

export default PhotoCard;