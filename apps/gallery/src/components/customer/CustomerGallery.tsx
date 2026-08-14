import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import VirtualGrid from '@/components/common/VirtualGrid';
import BulkActionsBar from '@/components/customer/BulkActionsBar';
import type { Photo } from '@/types.ts';
import { getPhotoStyle } from '@/utils/styleUtils';

const VIRTUAL_SCROLL_THRESHOLD = 100;

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'favorites-first';
type FilterOption = 'all' | 'favorites' | 'approved' | 'rejected' | 'pending';

interface CustomerGalleryProps {
    photos: Photo[];
    favoritePhotoIds: Set<string>;
    onToggleFavorite: (photoId: string) => void;
    onOpenAddToCartModal: (photo: Photo) => void;
    onPhotoClick: (photo: Photo) => void;
    onNavigateToDownload?: () => void;
    onUpdateProofingStatus?: (photoId: string, status: 'approved' | 'rejected' | 'pending') => void;
    onBulkShare?: (photoIds: string[]) => void;
    onOpenProofing?: () => void;
    onDownloadHighRes?: (photo: Photo) => void;
    isOrderPaid?: boolean;
    isLoading?: boolean;
}

export const PhotoCardSkeleton: React.FC = () => (
    <div
        className="relative h-[350px] overflow-hidden rounded-2xl border border-white/5 bg-slate-900"
        aria-hidden="true"
    >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/[0.03] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 bg-gradient-to-t from-slate-950 p-5 pt-20">
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/10" />
            <div className="h-2 w-1/3 animate-pulse rounded-full bg-cyan-400/10" />
        </div>
    </div>
);

const PhotoCard: React.FC<{
    photo: Photo;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onAddToCart: () => void;
    onClick: () => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    onDownloadHighRes?: () => void;
    isOrderPaid?: boolean;
}> = ({ photo, isFavorite, onToggleFavorite, onAddToCart, onClick, isSelectionMode, isSelected, onToggleSelection, onDownloadHighRes, isOrderPaid }) => {
    const editStyle = useMemo(
        () => photo.manualEdits
            ? getPhotoStyle(photo.manualEdits)
            : { filter: undefined, transform: undefined },
        [photo.manualEdits],
    );
    const overlayRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useLayoutEffect(() => {
        if (overlayRef.current) overlayRef.current.style.setProperty('--photo-transform', editStyle.transform || 'none');
        if (imgRef.current) {
            imgRef.current.style.setProperty('--photo-filter', editStyle.filter || 'none');
            imgRef.current.style.setProperty('--photo-transform', editStyle.transform || 'none');
        }
    }, [editStyle]);

    return (
        <div
            className={`relative group overflow-hidden rounded-2xl cursor-pointer bg-slate-900 border border-white/5 transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:-translate-y-1.5 ${isSelected ? 'ring-4 ring-cyan-500 border-transparent shadow-[0_0_40px_rgba(34,211,238,0.4)]' : ''}`}
            onClick={isSelectionMode && onToggleSelection ? onToggleSelection : onClick}
        >
            <div
                ref={overlayRef}
                className="absolute inset-0 pointer-events-none z-[1] [transform:var(--photo-transform)]"
            ></div>
            <img
                ref={imgRef}
                src={photo.url}
                alt={photo.title}
                className="w-full h-full object-cover max-h-full origin-center transition-transform duration-700 group-hover:scale-110 [filter:var(--photo-filter)] [transform:var(--photo-transform)]"
                loading="lazy"
            />

            {/* Premium Selection Checkbox */}
            {isSelectionMode && (
                <div className="absolute top-3 left-3 z-30">
                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                        ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                        : 'bg-black/50 backdrop-blur-md border-white/30 hover:border-white/60'
                        }`}>
                        {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                </div>
            )}

            {/* Proofing Status Badge */}
            {photo.proofingStatus && (
                <div className={`absolute top-3 right-3 z-20 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/10 ${photo.proofingStatus === 'approved' ? 'bg-green-500/80 text-white' :
                    photo.proofingStatus === 'rejected' ? 'bg-red-500/80 text-white' :
                        'bg-yellow-500/80 text-white'
                    }`}>
                    {photo.proofingStatus}
                </div>
            )}

            {/* Cinematic Overlay Gradient */}
            {!isSelectionMode && (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex flex-col justify-end p-5">
                    <div className="flex justify-between items-end transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex-1 min-w-0 pr-4">
                            <h4 className="font-black text-white text-xs uppercase tracking-widest truncate mb-1">{photo.title}</h4>
                            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                <span className="text-cyan-400">View</span>
                                <span>•</span>
                                <span>Order Print</span>
                            </div>
                        </div>
                        <div className="flex space-x-2 flex-shrink-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                                className={`p-2.5 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${isFavorite ? 'bg-red-500/90 text-white border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                title="Favorite"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                                className="p-2.5 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center bg-cyan-500/90 text-white backdrop-blur-md border border-cyan-400/50 hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                                title="Order Print"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </button>
                            {photo.originalFilename && isOrderPaid && onDownloadHighRes && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDownloadHighRes(); }}
                                    className="p-2.5 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center bg-green-500/90 text-white backdrop-blur-md border border-green-400/50 hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                    title="Download High-Res"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Favorite Indicator (Small Heart) */}
            {isFavorite && !photo.proofingStatus && !isSelectionMode && (
                <div className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-lg shadow-lg z-20 border border-red-400/50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </div>
            )}
        </div>
    );
};

const CustomerGallery: React.FC<CustomerGalleryProps> = ({
    photos,
    favoritePhotoIds,
    onToggleFavorite,
    onOpenAddToCartModal,
    onPhotoClick,
    onNavigateToDownload,
    onUpdateProofingStatus,
    onBulkShare,
    onOpenProofing,
    onDownloadHighRes,
    isOrderPaid,
    isLoading = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(window.innerHeight - 300);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterOption>('all');
    const [sortOption, setSortOption] = useState<SortOption>('date-desc');
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());

    const useVirtualScrolling = photos.length >= VIRTUAL_SCROLL_THRESHOLD;

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerHeight(window.innerHeight - rect.top - 80);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const filteredAndSortedPhotos = useMemo(() => {
        let filtered = photos;
        if (debouncedSearchTerm) {
            const searchLower = debouncedSearchTerm.trim().toLowerCase();
            filtered = filtered.filter(photo => {
                const searchStrings = [
                    photo.title, 
                    photo.category, 
                    photo.originalFilename,
                    ...(photo.aiTags?.clothing_colors || []),
                    ...(photo.aiTags?.accessories || []),
                    photo.aiTags?.context
                ].filter(Boolean);
                
                return searchStrings.some(value => String(value || '').toLowerCase().includes(searchLower));
            });
        }
        if (filter !== 'all') {
            filtered = filtered.filter(photo => {
                if (filter === 'favorites') return favoritePhotoIds.has(photo.id);
                if (filter === 'pending') return !photo.proofingStatus || photo.proofingStatus === 'pending';
                return photo.proofingStatus === filter;
            });
        }
        return [...filtered].sort((a, b) => {
            switch (sortOption) {
                case 'title-asc': return (a.title || "").localeCompare(b.title || "");
                case 'title-desc': return (b.title || "").localeCompare(a.title || "");
                case 'favorites-first':
                    const aFav = favoritePhotoIds.has(a.id) ? 1 : 0;
                    const bFav = favoritePhotoIds.has(b.id) ? 1 : 0;
                    return bFav - aFav;
                default: return 0;
            }
        });
    }, [photos, debouncedSearchTerm, filter, sortOption, favoritePhotoIds]);

    const handleBulkDownload = () => {
        const photosToDownload = selectedPhotoIds.size > 0
            ? filteredAndSortedPhotos.filter(p => selectedPhotoIds.has(p.id))
            : filteredAndSortedPhotos;

        if (onNavigateToDownload) {
            onNavigateToDownload();
        } else if (window.confirm(`Download ${photosToDownload.length} photos?`)) {
            photosToDownload.forEach((photo, index) => {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = photo.url;
                    link.download = `${photo.title || 'photo'}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, index * 250);
            });
        }
    };

    const togglePhotoSelection = (photoId: string) => {
        setSelectedPhotoIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) newSet.delete(photoId);
            else newSet.add(photoId);
            return newSet;
        });
    };

    const PHOTO_CARD_WIDTH = 280;
    const PHOTO_CARD_HEIGHT = 350;

    const hasActiveFilters = searchTerm.length > 0 || filter !== 'all' || sortOption !== 'date-desc';
    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setFilter('all');
        setSortOption('date-desc');
        setSelectedPhotoIds(new Set());
    };

    return (
        <main ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
            {/* Cinematic Floating Toolbar */}
            <div className="sticky top-24 z-30 mb-10 space-y-4">
                <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">
                                Master <span className="text-cyan-400">Library</span>
                            </h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                {filteredAndSortedPhotos.length} Assets Found
                            </p>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>
                        <div className="flex items-center space-x-2">
                            {onOpenProofing && (
                                <button onClick={onOpenProofing} className="px-4 py-2 min-h-[48px] bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    Review Proofs
                                </button>
                            )}
                            <button
                                onClick={() => setIsSelectionMode(!isSelectionMode)}
                                className={`px-4 py-2 min-h-[48px] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${isSelectionMode
                                    ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                {isSelectionMode ? 'Cancel' : 'Multi-Select'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 max-w-md">
                        <div className="relative flex items-center group">
                            <input
                                type="text"
                                placeholder="Search 'red shirt', 'sunglasses', 'pool', or filename..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full min-h-[48px] bg-black/40 border border-white/5 rounded-2xl px-5 py-2.5 pl-11 text-white placeholder-slate-600 outline-none transition-all font-bold text-xs focus:ring-2 focus:ring-cyan-500/50"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 min-h-[48px] text-[10px] font-black uppercase tracking-widest text-slate-400 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="title-asc">Title A-Z</option>
                            <option value="favorites-first">Favorites First</option>
                        </select>
                        <button
                            onClick={handleBulkDownload}
                            className="p-2.5 min-h-[48px] min-w-[48px] flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all group shadow-lg"
                            title="Download All"
                            aria-label="Download All Asssets"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Sub-Filters */}
                <div className="flex items-center space-x-2 px-2">
                    {(['all', 'favorites', 'approved', 'rejected', 'pending'] as FilterOption[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 min-h-[48px] rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${filter === f
                                ? 'bg-white/10 text-white border-white/30'
                                : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div
                    className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4"
                    role="status"
                    aria-label="Loading gallery photos"
                    aria-busy="true"
                >
                    {Array.from({ length: 8 }, (_, index) => (
                        <PhotoCardSkeleton key={`photo-skeleton-${index}`} />
                    ))}
                </div>
            ) : filteredAndSortedPhotos.length === 0 ? (
                <div className="glass-panel rounded-3xl border-2 border-dashed border-white/10 px-6 py-24 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
                        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
                            <path d="m3 3 18 18M10.5 6H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4.5M14 6h4a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white">
                        {hasActiveFilters ? 'No matching photos' : 'Gallery coming soon'}
                    </h3>
                    <p className="mx-auto mt-3 max-w-md text-xs font-bold uppercase tracking-widest text-slate-500">
                        {hasActiveFilters
                            ? 'Try a broader search or restore the full gallery view.'
                            : 'Your resort photos will appear here as soon as they are synced.'}
                    </p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="mt-8 min-h-[48px] rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-6 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-500/20"
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            ) : useVirtualScrolling ? (
                <VirtualGrid
                    items={filteredAndSortedPhotos}
                    itemWidth={PHOTO_CARD_WIDTH}
                    itemHeight={PHOTO_CARD_HEIGHT}
                    containerHeight={containerHeight}
                    containerWidth="100%"
                    gap={24}
                    minColumns={2}
                    maxColumns={4}
                    renderItem={(photo, _index, _style) => (
                        <PhotoCard
                            key={photo.id}
                            photo={photo}
                            isFavorite={favoritePhotoIds.has(photo.id)}
                            onToggleFavorite={() => onToggleFavorite(photo.id)}
                            onAddToCart={() => onOpenAddToCartModal(photo)}
                            onClick={() => onPhotoClick(photo)}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedPhotoIds.has(photo.id)}
                            onToggleSelection={() => togglePhotoSelection(photo.id)}
                            onDownloadHighRes={() => onDownloadHighRes && onDownloadHighRes(photo)}
                            isOrderPaid={isOrderPaid}
                        />
                    )}
                />
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {filteredAndSortedPhotos.map(photo => (
                        <PhotoCard
                            key={photo.id}
                            photo={photo}
                            isFavorite={favoritePhotoIds.has(photo.id)}
                            onToggleFavorite={() => onToggleFavorite(photo.id)}
                            onAddToCart={() => onOpenAddToCartModal(photo)}
                            onClick={() => onPhotoClick(photo)}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedPhotoIds.has(photo.id)}
                            onToggleSelection={() => togglePhotoSelection(photo.id)}
                            onDownloadHighRes={() => onDownloadHighRes && onDownloadHighRes(photo)}
                            isOrderPaid={isOrderPaid}
                        />
                    ))}
                </div>
            )}

            {/* Premium Bulk Actions Bar */}
            {isSelectionMode && (
                <BulkActionsBar
                    selectedCount={selectedPhotoIds.size}
                    onSelectAll={() => setSelectedPhotoIds(new Set(filteredAndSortedPhotos.map(p => p.id)))}
                    onDeselectAll={() => setSelectedPhotoIds(new Set())}
                    onBulkDownload={handleBulkDownload}
                    onBulkShare={() => onBulkShare && onBulkShare(Array.from(selectedPhotoIds))}
                    onBulkApprove={() => {
                        selectedPhotoIds.forEach(id => onUpdateProofingStatus?.(id, 'approved'));
                        setSelectedPhotoIds(new Set());
                    }}
                    onBulkReject={() => {
                        selectedPhotoIds.forEach(id => onUpdateProofingStatus?.(id, 'rejected'));
                        setSelectedPhotoIds(new Set());
                    }}
                    onBulkFavorite={() => {
                        selectedPhotoIds.forEach(id => onToggleFavorite(id));
                        setSelectedPhotoIds(new Set());
                    }}
                    onClose={() => {
                        setIsSelectionMode(false);
                        setSelectedPhotoIds(new Set());
                    }}
                />
            )}
        </main>
    );
};

export default CustomerGallery;
