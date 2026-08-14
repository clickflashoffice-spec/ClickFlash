import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Photo } from '../../types';
import { getPhotoStyle } from '../../utils/styleUtils';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MagicEraserTool } from './MagicEraserTool';

interface EnhancedLightboxProps {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
  favoritePhotoIds: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onOpenAddToCartModal: (photo: Photo) => void;
}

type ZoomMode = 'fit' | number;

// Slide animation variants
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.95
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.95
  })
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-slate-500">{label}</dt>
    <dd className="truncate text-right font-semibold text-slate-200">{value || 'Unavailable'}</dd>
  </div>
);

function formatDimensions(photo: Photo): string | undefined {
  const width = photo.width || photo.metadata?.dimensions?.width;
  const height = photo.height || photo.metadata?.dimensions?.height;
  return width && height ? `${width} × ${height}` : undefined;
}

function formatBytes(value?: number): string | undefined {
  if (!value || value <= 0) return undefined;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
}

const EnhancedLightbox: React.FC<EnhancedLightboxProps> = ({
  photos,
  startIndex,
  onClose,
  favoritePhotoIds,
  onToggleFavorite,
  onOpenAddToCartModal
}) => {
  const initialIndex = Math.min(Math.max(startIndex, 0), Math.max(photos.length - 1, 0));
  const [[currentIndex, direction], setPage] = useState([initialIndex, 0]);
  const [zoom, setZoom] = useState<ZoomMode>('fit');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showMagicEraser, setShowMagicEraser] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const activePhoto = photos[currentIndex];
  const isFavorite = activePhoto ? favoritePhotoIds.has(activePhoto.id) : false;
  const editStyle = activePhoto?.manualEdits ? getPhotoStyle(activePhoto.manualEdits) : { filter: undefined, transform: undefined };

  useEffect(() => {
    if (photos.length === 0) return;
    const nextIndex = Math.min(Math.max(startIndex, 0), photos.length - 1);
    setPage([nextIndex, 0]);
  }, [photos.length, startIndex]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, []);

  const paginate = useCallback((newDirection: number) => {
    setZoom('fit');
    let nextIndex = currentIndex + newDirection;
    if (nextIndex < 0) nextIndex = photos.length - 1;
    if (nextIndex >= photos.length) nextIndex = 0;
    if (compareIndex === nextIndex && photos.length > 1) {
      setCompareIndex((nextIndex + 1) % photos.length);
    }
    setPage([nextIndex, newDirection]);
  }, [compareIndex, currentIndex, photos.length]);

  const handleNext = useCallback(() => paginate(1), [paginate]);
  const handlePrev = useCallback(() => paginate(-1), [paginate]);
  const resetView = useCallback(() => setZoom('fit'), []);

  const zoomIn = useCallback(() => setZoom(prev => (prev === 'fit' ? 1.5 : Math.min(prev * 1.3, 5))), []);
  const zoomOut = useCallback(() => setZoom(prev => {
    if (prev === 'fit') return 'fit';
    const newZoom = prev / 1.3;
    return newZoom <= 1 ? 'fit' : newZoom;
  }), []);

  const toggleCompareMode = useCallback(() => {
    if (compareMode) {
      setCompareMode(false);
      return;
    }
    if (photos.length > 1) {
      setCompareIndex((currentIndex + 1) % photos.length);
      setCompareMode(true);
    }
  }, [compareMode, currentIndex, photos.length]);

  const stepComparison = useCallback((step: number) => {
    setCompareIndex((previous) => {
      let next = ((previous ?? currentIndex) + step + photos.length) % photos.length;
      if (next === currentIndex && photos.length > 1) {
        next = (next + step + photos.length) % photos.length;
      }
      return next;
    });
  }, [currentIndex, photos.length]);

  useEffect(() => {
    if (compareMode && compareIndex === currentIndex && photos.length > 1) {
      setCompareIndex((currentIndex + 1) % photos.length);
    }
  }, [compareIndex, compareMode, currentIndex, photos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last?.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first?.focus();
          e.preventDefault();
        }
        return;
      }
      switch (e.key) {
        case 'Escape': compareMode ? setCompareMode(false) : onClose(); break;
        case 'ArrowRight': e.preventDefault(); handleNext(); break;
        case 'ArrowLeft': e.preventDefault(); handlePrev(); break;
        case '+': case '=': e.preventDefault(); zoomIn(); break;
        case '-': e.preventDefault(); zoomOut(); break;
        case '0': e.preventDefault(); resetView(); break;
        case 'c': case 'C': e.preventDefault(); toggleCompareMode(); break;
        case 'i': case 'I': e.preventDefault(); setShowInfo(value => !value); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, compareMode, handleNext, handlePrev, resetView, toggleCompareMode, zoomIn, zoomOut]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -10000) {
      handleNext();
    } else if (swipe > 10000) {
      handlePrev();
    } else if (offset.y > 100 || offset.y < -100) {
        // Vertical swipe to close
        onClose();
    }
  };

  const comparePhoto = compareIndex !== null ? photos[compareIndex] : null;

  if (showMagicEraser && activePhoto) {
    return (
      <MagicEraserTool
        imageUrl={activePhoto.url}
        onCancel={() => setShowMagicEraser(false)}
        onSuccess={(processedUrl) => {
          // In a real app we'd update the photo URL in the store
          activePhoto.url = processedUrl;
          setShowMagicEraser(false);
        }}
      />
    );
  }

  if (!activePhoto) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 bg-slate-950 z-[100] flex flex-col font-sans text-white overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Premium Top Bar */}
      <div className="relative z-[110] px-4 sm:px-6 py-4 flex justify-between items-center gap-4 overflow-x-auto glass-panel border-b border-white/5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col">
          <h3 id={titleId} className="text-xs font-black uppercase tracking-[0.2em] text-white italic">{activePhoto.title || 'Untitled photo'}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{currentIndex + 1} <span className="text-slate-700">/</span> {photos.length} <span className="text-slate-700 ml-1">•</span> <span className="text-cyan-400">Master View</span></p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Virtual Zoom Controls */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            <button type="button" onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Zoom Out" aria-label="Zoom out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M20 12H4" /></svg>
            </button>
            <div className="text-[9px] font-black uppercase tracking-widest w-12 text-center text-slate-300">
              {typeof zoom === 'number' ? `${Math.round(zoom * 100)}%` : 'Fit'}
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Zoom In" aria-label="Zoom in">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <div className="h-6 w-px bg-white/5 mx-1"></div>

          <button type="button" onClick={(e) => { e.stopPropagation(); toggleCompareMode(); }} disabled={photos.length < 2} aria-pressed={compareMode} aria-label="Compare photos" className={`p-2.5 rounded-xl transition-all border disabled:cursor-not-allowed disabled:opacity-30 ${compareMode ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`} title="Compare Photos (C)">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
          </button>

          <button type="button" onClick={(e) => { e.stopPropagation(); setShowInfo(value => !value); }} aria-pressed={showInfo} aria-label="Show photo information" className={`p-2.5 rounded-xl transition-all border ${showInfo ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`} title="Photo Information (I)">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 16v-4m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>

          <button type="button" onClick={(e) => { e.stopPropagation(); setShowMagicEraser(true); }} className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-500/40 hover:text-white transition-all shadow-lg" title="Magic Eraser" aria-label="Magic Eraser">
            <span className="font-bold tracking-widest px-1 text-xs uppercase flex items-center gap-1">✨ Erase</span>
          </button>

          <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavorite(activePhoto.id); }} aria-pressed={isFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} className={`p-2.5 rounded-xl transition-all border ${isFavorite ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'}`} title="Favorite">
            <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" /></svg>
          </button>

          <button type="button" onClick={(e) => { e.stopPropagation(); onOpenAddToCartModal(activePhoto); }} className="p-2.5 bg-cyan-500/90 text-white rounded-xl border border-cyan-400/50 hover:bg-cyan-400 transition-all shadow-lg" title="Add to Cart" aria-label="Add photo to cart">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </button>

          <button ref={closeButtonRef} type="button" onClick={onClose} className="p-2.5 bg-white/5 text-slate-400 border border-white/10 rounded-xl hover:text-white hover:border-white/20 transition-all ml-4" title="Close Lightbox" aria-label="Close lightbox">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Main Image Area with Framer Motion */}
      <div className="flex-1 flex overflow-hidden relative cursor-grab active:cursor-grabbing">
        {/* Navigation Layers */}
        <button type="button" className="absolute inset-y-0 left-0 w-32 z-[105] flex items-center justify-center group/nav" onClick={(e) => { e.stopPropagation(); handlePrev(); }} aria-label="Previous photo">
          <div className="p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 text-white/30 group-hover/nav:text-white group-hover/nav:bg-cyan-500/20 group-hover/nav:border-cyan-500/30 transition-all transform -translate-x-12 group-hover/nav:translate-x-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 19l-7-7 7-7" /></svg>
          </div>
        </button>
        <button type="button" className="absolute inset-y-0 right-0 w-32 z-[105] flex items-center justify-center group/nav" onClick={(e) => { e.stopPropagation(); handleNext(); }} aria-label="Next photo">
          <div className="p-4 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5 text-white/30 group-hover/nav:text-white group-hover/nav:bg-cyan-500/20 group-hover/nav:border-cyan-500/30 transition-all transform translate-x-12 group-hover/nav:-translate-x-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5l7 7-7 7" /></svg>
          </div>
        </button>

        {showInfo && (
          <aside className="absolute left-4 top-4 z-[106] w-64 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl" aria-label="Photo information">
            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Photo information</h4>
            <dl className="space-y-2 text-xs">
              <InfoRow label="File" value={activePhoto.originalFilename || activePhoto.title || 'Untitled'} />
              <InfoRow label="Dimensions" value={formatDimensions(activePhoto)} />
              <InfoRow label="Size" value={formatBytes(activePhoto.fileSize || activePhoto.size)} />
              <InfoRow label="Captured" value={formatDate(activePhoto.capturedAt || activePhoto.metadata?.dateTaken)} />
              <InfoRow label="Camera" value={activePhoto.metadata?.camera || activePhoto.metadata?.exif?.Model} />
            </dl>
          </aside>
        )}

        {/* Primary Image */}
        <div className={`relative flex-1 flex items-center justify-center overflow-hidden ${compareMode ? 'w-1/2' : 'w-full'}`} onClick={e => e.stopPropagation()}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.img
              key={currentIndex}
              src={activePhoto.url}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag={zoom === 'fit' ? true : false}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
              alt={activePhoto.title}
              className="absolute max-w-[95%] max-h-[95%] object-contain shadow-2xl origin-center"
              style={{
                filter: editStyle.filter,
                scale: zoom === 'fit' ? 1 : zoom
              }}
              draggable={false}
            />
          </AnimatePresence>
        </div>

        {compareMode && comparePhoto && (
          <div className="w-1/2 flex items-center justify-center overflow-hidden border-l border-white/5 bg-black/20 relative z-[100]" onClick={(e) => e.stopPropagation()}>
            <img src={comparePhoto.url} alt={comparePhoto.title} className="max-w-[90%] max-h-[90%] object-contain" />
            <div className="absolute bottom-8 right-8 flex items-center space-x-3 bg-black/50 backdrop-blur-xl border border-white/10 p-2 rounded-2xl">
              <button type="button" onClick={() => stepComparison(-1)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all" aria-label="Previous comparison photo">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Comparing</div>
              <button type="button" onClick={() => stepComparison(1)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all" aria-label="Next comparison photo">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Filmstrip */}
      <div className="h-28 glass-panel border-t border-white/5 flex items-center px-8 gap-3 overflow-x-auto relative z-[110]" onClick={e => e.stopPropagation()} aria-label="Gallery thumbnails">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); setPage([idx, idx > currentIndex ? 1 : -1]); resetView(); }}
            aria-label={`View photo ${idx + 1}: ${photo.title || 'Untitled photo'}`}
            aria-current={idx === currentIndex ? 'true' : undefined}
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
