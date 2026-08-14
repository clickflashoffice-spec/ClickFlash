import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Photo } from '../../types';

interface MasonryPhotoGridProps {
  photos: Photo[];
  cartItemIds: Set<string>;
  onPhotoClick: (photo: Photo) => void;
  onToggleFavorite?: (photoId: string) => void;
  favorites?: Set<string>;
  columns?: number;
}

const PhotoCardItem = React.memo(({ 
  photo, 
  isSelected, 
  isFavorite, 
  onClick, 
  onToggleFavorite 
}: { 
  photo: Photo; 
  isSelected: boolean; 
  isFavorite: boolean; 
  onClick: () => void;
  onToggleFavorite?: (id: string) => void;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <motion.div
      layoutId={`masonry-photo-${photo.id}`}
      className="relative mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-300 dark:bg-slate-700" />
      )}
      
      <img
        src={photo.url}
        alt={photo.title || 'Photo'}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-auto object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* AI Quality Badge */}
      {(photo as any).aiQualityScore && (photo as any).aiQualityScore > 0.8 && (
        <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg backdrop-blur-md">
          Top Pick
        </div>
      )}

      {/* Favorite Toggle */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(photo.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-colors ${isFavorite ? 'text-red-500 fill-current' : 'text-white'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isFavorite ? 0 : 2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      )}

      {/* Selection Badge */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute bottom-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

PhotoCardItem.displayName = 'PhotoCardItem';

export const MasonryPhotoGrid: React.FC<MasonryPhotoGridProps> = ({
  photos,
  cartItemIds,
  onPhotoClick,
  onToggleFavorite,
  favorites = new Set(),
  columns = 3
}) => {
  // Staggered columns
  const getColSpanClass = () => {
    switch (columns) {
      case 2: return 'columns-1 sm:columns-2';
      case 4: return 'columns-2 sm:columns-3 lg:columns-4';
      case 3:
      default: return 'columns-2 sm:columns-3';
    }
  };

  return (
    <div className={`gap-4 ${getColSpanClass()}`}>
      <AnimatePresence>
        {photos.map(photo => (
          <PhotoCardItem
            key={photo.id}
            photo={photo}
            isSelected={cartItemIds.has(photo.id)}
            isFavorite={favorites.has(photo.id)}
            onClick={() => onPhotoClick(photo)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
