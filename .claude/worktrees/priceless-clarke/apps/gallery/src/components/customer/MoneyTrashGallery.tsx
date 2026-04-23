import React, { useState, useMemo } from 'react';
import VirtualGrid from '../common/VirtualGrid';
import MoneyTrashBadge, { MoneyTrashWarningBanner } from './MoneyTrashBadge';
import { MoneyTrashPhoto, TrashGallery } from '../../services/moneyTrashService';
import { getPhotoStyle } from '../../utils/styleUtils';
import { useCurrency } from '../CurrencyContext';

type SortOption = 'expiring-soon' | 'discount-high' | 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';
type FilterOption = 'all' | 'critical' | 'urgent' | 'safe';

interface MoneyTrashGalleryProps {
  trashGallery: TrashGallery;
  favoritePhotoIds: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  onOpenAddToCartModal: (photo: MoneyTrashPhoto) => void;
  onPhotoClick: (photo: MoneyTrashPhoto) => void;
  onBulkAddToCart?: (photos: MoneyTrashPhoto[]) => void;
}

const MoneyTrashPhotoCard: React.FC<{
  photo: MoneyTrashPhoto;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onAddToCart: () => void;
  onClick: () => void;
  style?: React.CSSProperties;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}> = ({
  photo,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onClick,
  style,
  isSelectionMode,
  isSelected,
  onToggleSelection
}) => {
    const { formatCurrency } = useCurrency();
    const editStyle = photo.manualEdits ? getPhotoStyle(photo.manualEdits) : { filter: undefined, transform: undefined };

    const isCritical = photo.daysUntilDeletion <= 1;
    const isUrgent = photo.daysUntilDeletion <= 3;

    return (
      <div
        className={`relative group overflow-hidden rounded-2xl cursor-pointer bg-slate-900 border border-white/5 transition-all duration-500 hover:-translate-y-2
        ${isSelected ? 'ring-4 ring-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : ''} 
        ${isCritical ? 'ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}
        ${isUrgent && !isCritical ? 'border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : ''}
        `}
        onClick={isSelectionMode && onToggleSelection ? onToggleSelection : onClick}
        style={style}
      >
        <div
          className="absolute inset-0 pointer-events-none z-[1] [transform:var(--photo-transform)]"
          style={{ '--photo-transform': editStyle.transform } as React.CSSProperties}
        />

        <img
          src={photo.url}
          alt={photo.title}
          className="w-full h-full object-cover max-h-full origin-center transition-transform duration-700 group-hover:scale-110 [filter:var(--photo-filter)] [transform:var(--photo-transform)]"
          loading="lazy"
          style={{
            '--photo-filter': editStyle.filter,
            '--photo-transform': editStyle.transform
          } as React.CSSProperties}
        />

        <div className="absolute top-3 left-3 z-20">
          <MoneyTrashBadge
            discountPercentage={photo.discountPercentage}
            daysUntilDeletion={photo.daysUntilDeletion}
            size="sm"
            variant="overlay"
          />
        </div>

        {isSelectionMode && (
          <div className="absolute top-3 right-3 z-30">
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
              ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
              : 'bg-black/50 backdrop-blur-md border-white/20'
              }`}>
              {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}

        {!isSelectionMode && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex flex-col justify-end p-5">
            <div className="mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-black text-xl italic tracking-tighter">{formatCurrency(photo.discountPrice)}</span>
                <span className="text-slate-500 line-through text-xs font-bold">{formatCurrency(photo.originalPrice)}</span>
              </div>
              <div className="text-cyan-400 text-[9px] font-black uppercase tracking-[0.2em] shadow-sm">
                Save {formatCurrency(photo.originalPrice - photo.discountPrice)} ({photo.discountPercentage}% OFF)
              </div>
            </div>

            <div className="flex space-x-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={`p-2.5 rounded-xl backdrop-blur-md border border-white/20 transition-all ${isFavorite ? 'bg-red-500 text-white border-red-400/50' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                className="flex-1 py-2.5 bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-cyan-400/50 hover:bg-cyan-400 transition-all shadow-lg active:scale-95"
              >
                Buy Now
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

export const MoneyTrashGallery: React.FC<MoneyTrashGalleryProps> = ({
  trashGallery,
  favoritePhotoIds,
  onToggleFavorite,
  onOpenAddToCartModal,
  onPhotoClick,
  onBulkAddToCart
}) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('expiring-soon');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const processedPhotos = useMemo(() => {
    let result = [...trashGallery.photos];
    if (filterBy === 'critical') result = result.filter(p => p.daysUntilDeletion <= 1);
    else if (filterBy === 'urgent') result = result.filter(p => p.daysUntilDeletion <= 3);
    else if (filterBy === 'safe') result = result.filter(p => p.daysUntilDeletion > 3);

    result.sort((a, b) => {
      if (sortBy === 'expiring-soon') return a.daysUntilDeletion - b.daysUntilDeletion;
      if (sortBy === 'discount-high') return b.discountPercentage - a.discountPercentage;
      if (sortBy === 'date-desc') return new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime();
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      return 0;
    });
    return result;
  }, [trashGallery.photos, sortBy, filterBy]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 sm:p-8 animate-fade-in-down pb-32">
      <div className="mb-10">
        <MoneyTrashWarningBanner
          daysUntilDeletion={trashGallery.photos[0]?.daysUntilDeletion || 0}
          photoCount={trashGallery.totalPhotos}
        />
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Event <span className="text-cyan-400">Archive</span></h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{processedPhotos.length} Flash Sales Available</p>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2 hidden lg:block"></div>
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
            {(['all', 'critical', 'urgent'] as FilterOption[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterBy(f)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filterBy === f
                    ? 'bg-cyan-500 text-white shadow-lg border border-cyan-400/50'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-black/40 border border-white/5 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
          >
            <option value="expiring-soon">Expiring Soon</option>
            <option value="discount-high">Highest Discount</option>
            <option value="date-desc">Newest First</option>
          </select>
          <button
            onClick={() => setSelectionMode(!selectionMode)}
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${selectionMode
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg'
                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
              }`}
          >
            {selectionMode ? 'Cancel Selection' : 'Select Multiple'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[600px]">
        {processedPhotos.length === 0 ? (
          <div className="text-center py-32 glass-panel rounded-3xl border-dashed border-2 border-white/5">
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">
              No urgent assets found in this archive segment.
            </p>
          </div>
        ) : (
          <VirtualGrid
            items={processedPhotos}
            renderItem={(photo, idx, style) => (
              <MoneyTrashPhotoCard
                key={photo.id}
                photo={photo}
                isFavorite={favoritePhotoIds.has(photo.id)}
                onToggleFavorite={() => onToggleFavorite(photo.id)}
                onAddToCart={() => onOpenAddToCartModal(photo)}
                onClick={() => onPhotoClick(photo)}
                isSelectionMode={selectionMode}
                isSelected={selectedIds.has(photo.id)}
                onToggleSelection={() => toggleSelection(photo.id)}
                style={style as React.CSSProperties}
              />
            )}
            itemWidth={300}
            itemHeight={400}
            gap={24}
            containerHeight={800}
          />
        )}
      </div>
    </div>
  );
};
