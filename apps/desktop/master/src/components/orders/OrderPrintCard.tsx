import React, { useState, useCallback, useRef, useEffect } from 'react';
import { OrderItem } from '../../types';

interface OrderPrintCardProps {
  item: OrderItem;
  orderId?: string;
  isPrinted: boolean;
  isSelected: boolean;
  onPrint: (item: OrderItem) => void;
  onToggleSelect: (itemId: string) => void;
  onReprocess: (item: OrderItem) => void;
}

/**
 * Memoized card component for individual order items
 * Optimized for performance with lazy loading and debounced interactions
 */
const OrderPrintCard: React.FC<OrderPrintCardProps> = React.memo(({
  item,
  orderId,
  isPrinted,
  isSelected,
  onPrint,
  onToggleSelect,
  onReprocess
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  let imageUrl = item.photo?.url || (item as any).url;

  // Rule: If URL is just a filename (rewritten by Touch App), assume it's an asset needing serving via /assets endpoint
  // Check if it looks like a relative filename (no http, no slash at start)
  if (typeof imageUrl === 'string' && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') && !imageUrl.startsWith('blob:')) {
    // It's a localized asset from the push sync
    imageUrl = `/api/orders/${orderId || item.id}/assets?url=${imageUrl}`;
    // Note: item.orderId might not be on OrderItem type directly, need to check parent or props. 
    // Actually `item` is `OrderItem`, it doesn't usually have orderId.
    // We need orderId here. 
    // OrderPrintCard receives `item` but we don't see `orderId` in props easily unless we pass it.
    // BUT: Wait, `OrderManagementView` passes `item`.
  } else if (typeof imageUrl === 'string' && (imageUrl.includes(':8091') || imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'))) {
    // Legacy/Fallback for non-pushed
    try {
      if (imageUrl.startsWith('http')) {
        const urlObj = new URL(imageUrl);
        // Rewriting logic...
        if (urlObj.pathname.includes('/api/files/')) {
          imageUrl = urlObj.pathname + urlObj.search;
        }
      }
    } catch (e) {
      imageUrl = imageUrl.replace(/^http:\/\/[^/]+:8091/, '');
    }
  }

  // Lazy load image using Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    // Optimization: If it's a data URI, load immediately (already in memory)
    if (imageUrl?.startsWith('data:')) {
      imgRef.current.src = imageUrl;
      // Trigger load state immediately, but real 'load' event will still fire
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              observer.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [imageUrl]);

  // Optimized print handler with requestAnimationFrame
  const handlePrint = useCallback(() => {
    if (isPrinting) return;

    setIsPrinting(true);

    // Use requestAnimationFrame to ensure UI updates before heavy operation
    requestAnimationFrame(() => {
      setTimeout(() => {
        onPrint(item);
        setIsPrinting(false);
      }, 0);
    });
  }, [item, onPrint, isPrinting]);

  // Optimized checkbox handler
  const handleToggleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    requestAnimationFrame(() => {
      onToggleSelect(item.id);
    });
  }, [item.id, onToggleSelect]);



  return (
    <div
      ref={cardRef}
      className={`will-change-transform relative group bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden transition-all duration-300 border-2 ${isSelected
        ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-[1.02]'
        : isPrinted
          ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)] opacity-90'
          : 'border-slate-700/50 hover:border-blue-400/50 shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]'
        }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-30">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelect}
            aria-label="Select order item"
            className="w-5 h-5 rounded border-2 border-white/30 bg-slate-900/80 checked:bg-blue-600 checked:border-blue-600 cursor-pointer transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          />
        </label>
      </div>

      {/* Status Badge */}
      {isPrinted && (
        <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg shadow-green-500/50 flex items-center pointer-events-none border border-white/20 backdrop-blur-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          PRINTED
        </div>
      )}

      {/* Quantity Badge */}
      {item.quantity > 1 && !isPrinted && (
        <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black px-3 py-1.5 rounded-lg shadow-lg border border-white/20 pointer-events-none text-sm backdrop-blur-sm">
          ×{item.quantity}
        </div>
      )}

      {/* Image Preview */}
      <div className="aspect-[4/3] bg-gradient-to-br from-slate-950 to-slate-900 relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <>
            {/* Blur placeholder */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-slate-800 animate-pulse" />
            )}

            <img
              ref={imgRef}
              data-src={imageUrl}
              alt={item.name}
              className={`w-full h-full object-contain select-none pointer-events-none transition-all duration-500 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
              loading="lazy"
            />

            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-sm">Image Error</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-600 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">No Preview</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <button
            onClick={(e) => { e.stopPropagation(); onReprocess(item); }}
            className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white font-bold text-xs uppercase tracking-widest border border-white/20 transition-all flex items-center justify-center gap-2 mb-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Fine-Tune / Reprocess
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white text-lg uppercase tracking-wide truncate">
              {item.format || 'Standard Print'}
            </h3>
            <p className="text-xs text-slate-400 font-mono truncate mt-1" title={item.photo?.title || item.name}>
              {item.photo?.title || item.name}
            </p>
          </div>
          {item.name.toLowerCase().includes('ai') && (
            <span className="ml-2 text-[10px] font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30 pointer-events-none whitespace-nowrap">
              AI EDIT
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center uppercase tracking-wider transition-all transform active:scale-95 shadow-lg ${isPrinting
              ? 'bg-slate-700 text-slate-500 cursor-wait'
              : isPrinted
                ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-slate-300 hover:from-slate-600 hover:to-slate-500 border border-slate-500/50'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-600/30'
              }`}
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isPrinted ? 'Reprint' : 'Print'}
              </>
            )}
          </button>
          <button
            onClick={() => onReprocess(item)}
            title="Edit / Fine-tune"
            className="px-4 py-3 bg-slate-700/50 hover:bg-slate-600 rounded-xl text-slate-300 transition-all border border-white/5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these props change
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isPrinted === nextProps.isPrinted &&
    prevProps.isSelected === nextProps.isSelected
  );
});

OrderPrintCard.displayName = 'OrderPrintCard';

export default OrderPrintCard;
