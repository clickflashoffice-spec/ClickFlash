import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Photo } from '../../types';
import { getPhotoStyle } from '../../utils/styleUtils';

interface EnhancedLightboxProps {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
  favoritePhotoIds: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onOpenAddToCartModal: (photo: Photo) => void;
}

type ZoomMode = 'fit' | number;

const EnhancedLightbox: React.FC<EnhancedLightboxProps> = ({
  photos,
  startIndex,
  onClose,
  favoritePhotoIds,
  onToggleFavorite,
  onOpenAddToCartModal
}) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [zoom, setZoom] = useState<ZoomMode>('fit');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Swipe detection states
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const activePhoto = photos[currentIndex];
  const isFavorite = favoritePhotoIds.has(activePhoto.id);
  const editStyle = activePhoto.manualEdits ? getPhotoStyle(activePhoto.manualEdits) : { filter: undefined, transform: undefined };

  const [highResLoaded, setHighResLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    if (imgRef.current) {
      const transform = typeof zoom === 'number' ? `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` : 'scale(1)';
      imgRef.current.style.setProperty('transform', transform);
      imgRef.current.style.setProperty('filter', editStyle.filter || 'none');
    }
  }, [zoom, pan, editStyle]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    resetView();
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    resetView();
  }, [photos.length]);

  const resetView = () => {
    setZoom('fit');
    setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setZoom((prev) => (prev === 'fit' ? 1.5 : Math.min(prev * 1.3, 5)));
  };

  const zoomOut = () => {
    setZoom((prev) => {
      if (prev === 'fit') return 'fit';
      const newZoom = prev / 1.3;
      return newZoom <= 1 ? 'fit' : newZoom;
    });
    if (zoom === 'fit' || (typeof zoom === 'number' && zoom <= 1.3)) setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (typeof zoom === 'number' && zoom > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && typeof zoom === 'number' && zoom > 1) {
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': compareMode ? setCompareMode(false) : onClose(); break;
        case 'ArrowRight': handleNext(); break;
        case 'ArrowLeft': handlePrev(); break;
        case '+': case '=': e.preventDefault(); zoomIn(); break;
        case '-': e.preventDefault(); zoomOut(); break;
        case '0': e.preventDefault(); resetView(); break;
        case 'c': case 'C': e.preventDefault(); setCompareMode(!compareMode); break;
        case 'i': case 'I': e.preventDefault(); setShowInfo(!showInfo); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, compareMode, handleNext, handlePrev, showInfo]);

  const comparePhoto = compareIndex !== null ? photos[compareIndex] : null;

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col font-sans text-white overflow-hidden" onClick={onClose}>
      {/* Premium Top Bar */}
      <div className="relative z-[110] px-6 py-4 flex justify-between items-center glass-panel border-b border-white/5 shadow-2xl">
        <div className="flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white italic">{activePhoto.title}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{currentIndex + 1} <span className="text-slate-700">/</span> {photos.length} <span className="text-slate-700 ml-1">•</span> <span className="text-cyan-400">Master View</span></p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Virtual Zoom Controls */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Zoom Out" aria-label="Zoom Out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M20 12H4" /></svg>
            </button>
            <div className="text-[9px] font-black uppercase tracking-widest w-12 text-center text-slate-300">
              {typeof zoom === 'number' ? `${Math.round(zoom * 100)}%` : 'Fit'}
            </div>
            <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Zoom In" aria-label="Zoom In">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <div className="h-6 w-px bg-white/5 mx-1"></div>

          <button onClick={(e) => { e.stopPropagation(); setCompareMode(!compareMode); }} className={`p-2.5 rounded-xl transition-all border ${compareMode ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`} title="Compare Photos (C)" aria-label="Compare Photos">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
          </button>

          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(activePhoto.id); }} className={`p-2.5 rounded-xl transition-all border ${isFavorite ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`} title="Favorite" aria-label="Add to Favorites">
            <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
          </button>

          <button onClick={(e) => { e.stopPropagation(); onOpenAddToCartModal(activePhoto); }} className="p-2.5 bg-cyan-500/90 text-white rounded-xl border border-cyan-400/50 hover:bg-cyan-400 transition-all shadow-lg" title="Add to Cart" aria-label="Add to Cart">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </button>

          <button onClick={onClose} className="p-2.5 bg-white/5 text-slate-400 border border-white/10 rounded-xl hover:text-white hover:border-white/20 transition-all ml-4" title="Close Lightbox" aria-label="Close Lightbox">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Layers */}
        <div className="absolute inset-y-0 left-0 w-32 z-20 flex items-center justify-center group/nav" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
          <div className="p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 text-white/30 group-hover/nav:text-white group-hover/nav:bg-cyan-500/20 group-hover/nav:border-cyan-500/30 transition-all transform -translate-x-12 group-hover/nav:translate-x-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
          </div>
        </div>
        <div className="absolute inset-y-0 right-0 w-32 z-20 flex items-center justify-center group/nav" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
          <div className="p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 text-white/30 group-hover/nav:text-white group-hover/nav:bg-cyan-500/20 group-hover/nav:border-cyan-500/30 transition-all transform translate-x-12 group-hover/nav:-translate-x-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>

        {/* Primary Image */}
        <div
          className={`relative flex-1 flex items-center justify-center overflow-hidden transition-all duration-500 ${compareMode ? 'w-1/2' : 'w-full'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Blur Placeholder */}
          {!highResLoaded && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0">
              <div className="w-24 h-24 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          )}

          <img
            ref={imgRef}
            src={activePhoto.url}
            alt={activePhoto.title}
            onLoad={() => setHighResLoaded(true)}
            className={`max-w-[95%] max-h-[95%] object-contain shadow-2xl transition-all duration-500 origin-center ${isDragging ? 'cursor-grabbing' : typeof zoom === 'number' && zoom > 1 ? 'cursor-grab' : 'cursor-default'} ${highResLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            draggable={false}
          />
        </div>

        {compareMode && comparePhoto && (
          <div className="w-1/2 flex items-center justify-center overflow-hidden border-l border-white/5 bg-black/20 relative" onClick={(e) => e.stopPropagation()}>
            <img src={comparePhoto.url} alt={comparePhoto.title} className="max-w-[90%] max-h-[90%] object-contain" />
            <div className="absolute bottom-8 right-8 flex items-center space-x-3 bg-black/50 backdrop-blur-xl border border-white/10 p-2 rounded-2xl">
              <button onClick={() => setCompareIndex((prev) => prev !== null ? (prev - 1 + photos.length) % photos.length : 1)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all" title="Previous Comparison" aria-label="Previous Comparison">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Comparing</div>
              <button onClick={() => setCompareIndex((prev) => prev !== null ? (prev + 1) % photos.length : 1)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all" title="Next Comparison" aria-label="Next Comparison">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Filmstrip */}
      <div className="h-28 glass-panel border-t border-white/5 flex items-center px-8 gap-3 overflow-x-auto relative z-20">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); resetView(); }}
            className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 relative group ${idx === currentIndex ? 'border-cyan-500 scale-110 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
          >
            <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
            {idx === currentIndex && (
              <div className="absolute inset-0 bg-cyan-500/10"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EnhancedLightbox;
