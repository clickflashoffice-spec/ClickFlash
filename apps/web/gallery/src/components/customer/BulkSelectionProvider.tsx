import React, { useState, useCallback, useEffect } from 'react';
import { Photo } from '../../types';

interface BulkSelectionProviderProps {
  children: React.ReactNode;
  photos: Photo[];
  onBulkAddToCart?: (photos: Photo[]) => void;
  onBulkFavorite?: (photoIds: string[]) => void;
  onBulkDownload?: (photos: Photo[]) => void;
  onBulkShare?: (photos: Photo[]) => void;
}

interface SelectionContextType {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  toggleSelection: (photoId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectRange: (startId: string, endId: string) => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  selectedCount: number;
  selectedPhotos: Photo[];
  isSelected: (photoId: string) => boolean;
}

const BulkSelectionContext = React.createContext<SelectionContextType | null>(null);

export const useBulkSelection = () => {
  const context = React.useContext(BulkSelectionContext);
  if (!context) {
    throw new Error('useBulkSelection must be used within BulkSelectionProvider');
  }
  return context;
};

export const BulkSelectionProvider: React.FC<BulkSelectionProviderProps> = ({
  children,
  photos,
  onBulkAddToCart,
  onBulkFavorite,
  onBulkDownload,
  onBulkShare
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const toggleSelection = useCallback((photoId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
    setLastSelectedId(photoId);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(photos.map(p => p.id)));
  }, [photos]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectRange = useCallback((startId: string, endId: string) => {
    const startIndex = photos.findIndex(p => p.id === startId);
    const endIndex = photos.findIndex(p => p.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    const rangeIds = photos.slice(min, max + 1).map(p => p.id);
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      rangeIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [photos]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    deselectAll();
  }, [deselectAll]);

  const isSelected = useCallback((photoId: string) => {
    return selectedIds.has(photoId);
  }, [selectedIds]);

  const selectedPhotos = photos.filter(p => selectedIds.has(p.id));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelectionMode) return;

      switch (e.key) {
        case 'Escape':
          exitSelectionMode();
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selectAll();
          }
          break;
        case 'Delete':
        case 'Backspace':
          deselectAll();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, exitSelectionMode, selectAll, deselectAll]);

  const value: SelectionContextType = {
    selectedIds,
    isSelectionMode,
    toggleSelection,
    selectAll,
    deselectAll,
    selectRange,
    enterSelectionMode,
    exitSelectionMode,
    selectedCount: selectedIds.size,
    selectedPhotos,
    isSelected
  };

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
      {/* Floating Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          selectedPhotos={selectedPhotos}
          onClose={exitSelectionMode}
          onAddToCart={onBulkAddToCart}
          onFavorite={onBulkFavorite}
          onDownload={onBulkDownload}
          onShare={onBulkShare}
        />
      )}
    </BulkSelectionContext.Provider>
  );
};

interface BulkActionsBarProps {
  selectedCount: number;
  selectedPhotos: Photo[];
  onClose: () => void;
  onAddToCart?: (photos: Photo[]) => void;
  onFavorite?: (photoIds: string[]) => void;
  onDownload?: (photos: Photo[]) => void;
  onShare?: (photos: Photo[]) => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedPhotos,
  onClose,
  onAddToCart,
  onFavorite,
  onDownload,
  onShare
}) => {
  const [showActions, setShowActions] = useState(true);

  const handleAddToCart = () => {
    onAddToCart?.(selectedPhotos);
  };

  const handleFavorite = () => {
    onFavorite?.(selectedPhotos.map(p => p.id));
  };

  const handleDownload = () => {
    onDownload?.(selectedPhotos);
  };

  const handleShare = () => {
    onShare?.(selectedPhotos);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 min-w-[600px]">
        {/* Selection Count */}
        <div className="flex items-center gap-3 pr-4 border-r border-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            {selectedCount}
          </div>
          <span className="text-sm text-slate-300">
            {selectedCount === 1 ? 'photo' : 'photos'} selected
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-1">
          {onAddToCart && (
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Add to Cart
            </button>
          )}

          {onFavorite && (
            <button
              onClick={handleFavorite}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Favorite
            </button>
          )}

          {onDownload && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}

          {onShare && (
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BulkSelectionProvider;
