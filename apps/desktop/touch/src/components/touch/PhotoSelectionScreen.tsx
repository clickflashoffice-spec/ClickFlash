
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Album, Photo, PhotoCategory, CartItem, DestinationFeatures } from '../../types.ts';
import SelectionCartBar from './SelectionCartBar';
import { MOCK_PRINT_SIZES } from '../../constants.ts';
import { useKiosk } from '../../context/KioskContext.tsx';
import { webSocketService } from '../../services/webSocketService.ts';
import FaceSearchModal from './FaceSearchModal';
import { faceRecognitionService } from '../../services/faceRecognitionService.ts';
import VirtualGrid from '../common/VirtualGrid';
import { logger } from '../../utils/logger';
import { analytics } from '../../utils/telemetry';

// Threshold for enabling virtual scrolling (performance optimization)
const VIRTUAL_SCROLL_THRESHOLD = 50; // Lower threshold for Touch kiosk performance

/**
 * Photo Card Component
 * Memoized for performance optimization
 */
const PhotoCard: React.FC<{
    photo: Photo;
    isInCart: boolean;
    onClick: () => void;
    style?: React.CSSProperties;
}> = React.memo(({ photo, isInCart, onClick, style }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
    <motion.div 
        layoutId={`photo-container-${photo.id}`}
        className="group cursor-pointer aspect-square relative" 
        onClick={onClick} 
        style={style} 
        data-testid="photo-card"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
    >
        {!isLoaded && (
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
        )}
        <motion.img
            layoutId={`photo-img-${photo.id}`}
            src={photo.url}
            alt={photo.title}
            onLoad={() => setIsLoaded(true)}
            data-testid="photo-card-image"
            className={`w-full h-full object-cover rounded-2xl shadow-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
        />
        {isInCart && (
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xl" 
                aria-label="Photo in cart"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </motion.div>
        )}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all pointer-events-none" />
    </motion.div>
)}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.photo.id === nextProps.photo.id &&
        prevProps.photo.url === nextProps.photo.url &&
        prevProps.isInCart === nextProps.isInCart &&
        prevProps.style === nextProps.style; // Style prop from VirtualGrid is stable
});

PhotoCard.displayName = 'PhotoCard';

interface PhotoSelectionScreenProps {
    albums: Album[];
    onPhotoClick: (photo: Photo, album: Album) => void;
    onShowCart: () => void;
    cart: CartItem[];
    onBack: () => void;
    roomNumber?: string;
    showToast: (message: string) => void;
    globalFeatures?: DestinationFeatures;
    onBulkUpdateCart?: (items: CartItem[]) => void;
}

const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({
    albums,
    onPhotoClick,
    onShowCart,
    cart,
    onBack,
    roomNumber,
    showToast,
    globalFeatures = { ai: true, face: true, watermark: true },
    onBulkUpdateCart
}) => {
    const { products } = useKiosk();
    const containerRef = useRef<HTMLElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | 'All' | 'Matched'>('All');
    const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
    const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
    const [matchedPhotos, setMatchedPhotos] = useState<Photo[]>([]);
    // Default to true so the feature is visible immediately after upgrade
    const [enableFaceSearch, setEnableFaceSearch] = useState(true);

    useEffect(() => {
        // Check settings
        const savedSettings = localStorage.getItem('kioskSettingsV2');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                // If the setting exists, use it. If undefined (legacy), default to true.
                if (parsed.enableFaceSearch !== undefined) {
                    setEnableFaceSearch(!!parsed.enableFaceSearch);
                }
            } catch (e) { }
        }
    }, [albums]);

    const allCategories = useMemo((): (PhotoCategory | 'All' | 'Matched')[] => {
        const cats = new Set<PhotoCategory>();
        albums.forEach(album => (album.categories || []).forEach(cat => cats.add(cat)));
        const list: (PhotoCategory | 'All' | 'Matched')[] = ['All', ...Array.from(cats)];
        if (matchedPhotos.length > 0) list.splice(1, 0, 'Matched');
        return list;
    }, [albums, matchedPhotos]);


    const filteredAlbums = useMemo(() => {
        // First apply room number filter if specified
        let roomFilteredAlbums = albums;
        if (roomNumber && roomNumber.trim()) {
            const normalizedRoomNumber = roomNumber.trim();
            roomFilteredAlbums = albums.filter(album => {
                // Match exact room number (case-insensitive)
                const albumRoomNumber = album.roomNumber || '';
                return albumRoomNumber.toLowerCase() === normalizedRoomNumber.toLowerCase() ||
                    albumRoomNumber.trim() === normalizedRoomNumber;
            });
        }

        // Then apply category filter
        if (selectedCategory === 'Matched') {
            // Create a virtual album for matches (already filtered by room if applicable)
            return matchedPhotos.length > 0 ? [{
                id: 'matched-results',
                title: roomNumber ? `Your Matched Photos - Room ${roomNumber}` : 'Your Matched Photos',
                date: new Date().toISOString(),
                photographerId: 0,
                source: 'AI',
                roomNumber: roomNumber || '',
                coverPhotoUrl: matchedPhotos[0].url,
                photos: matchedPhotos
            } as Album] : [];
        }

        if (selectedCategory === 'All') return roomFilteredAlbums;
        return roomFilteredAlbums.filter(album => (album.categories || []).includes(selectedCategory as PhotoCategory));
    }, [albums, selectedCategory, matchedPhotos, roomNumber]);

    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleFaceSearch = async (blob: Blob) => {
        setIsFaceSearchOpen(false);

        // Validate blob
        if (!blob || blob.size === 0) {
            showToast("Invalid image captured. Please try again.");
            return;
        }

        showToast("Searching for matching faces...");
        analytics.trackEvent({ eventName: 'FACE_SEARCH_INITIATED', category: 'Engagement' });

        try {
            // Check if face is detected first (Client-side optimization)
            const faceDetected = await faceRecognitionService.detectFace(blob);
            if (!faceDetected) {
                showToast("No face detected in the image. Please ensure your face is clearly visible.");
                return;
            }

            // Perform Search on Server
            const allMatches = await faceRecognitionService.searchFaces(blob);

            // Filter results to only include photos from currently available albums (and current room)
            let validMatches = allMatches;

            // Determine valid album IDs based on current context
            const validAlbums = roomNumber && roomNumber.trim()
                ? albums.filter(a => (a.roomNumber || '').toLowerCase() === roomNumber.trim().toLowerCase())
                : albums;

            const validAlbumIds = new Set(validAlbums.map(a => a.id));

            // Apply filter
            validMatches = allMatches.filter(p => validAlbumIds.has(p.albumId));

            setMatchedPhotos(validMatches);

            if (validMatches.length > 0) {
                setSelectedCategory('Matched');
                showToast(`Found ${validMatches.length} matching photo${validMatches.length > 1 ? 's' : ''}!`);
            } else {
                showToast("No matching faces found in this gallery. Try a different photo or use room number search.");
            }
        } catch (error: unknown) {
            logger.error("Error in face search", error instanceof Error ? error : undefined);
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('timeout') || errorMessage.includes('time')) {
                showToast("Face search timed out. Please try again.");
            } else {
                showToast("Error during face search. Please try again.");
            }
        }
    };

    // Determine if face search feature is available (Both local setting AND global feature flag)
    const canUseFaceSearch = enableFaceSearch && globalFeatures.face;

    const handleSelectAll = () => {
        if (!onBulkUpdateCart) return;

        // aggregate all photos from filteredAlbums
        const allPhotos: Photo[] = [];
        filteredAlbums.forEach(album => {
            allPhotos.push(...(album.photos || []));
        });

        if (allPhotos.length === 0) {
            showToast("No photos to select.");
            return;
        }

        // Create cart items
        // We need to know the price, but CartItem usually just needs photo info + qty 1
        // Assuming default price or handled elsewhere, but CartItem structure is:
        // interface CartItem { id: string; photo: Photo; quantity: number; ... }
        // We'll create minimal valid CartItems.

        const defaultProduct = products[0];
        if (!defaultProduct) {
            showToast("No products defined. Please contact staff.");
            return;
        }

        const newItems: CartItem[] = allPhotos.map(photo => ({
            id: `${photo.id}-${defaultProduct.name}`, // Generate distinct ID per size logic in PhotoPreviewScreen
            photo: photo,
            quantity: 1,
            price: defaultProduct.price,
            albumId: photo.albumId,
            size: defaultProduct.name,
            mode: 'Normal',
            productId: defaultProduct.id
        }));

        onBulkUpdateCart(newItems);
        showToast(`Selected ${newItems.length} photos`);
        analytics.trackEvent({ eventName: 'BULK_SELECT_ALL', category: 'Engagement' });
    };

    const handleDeselectAll = () => {
        if (!onBulkUpdateCart) return;

        const allPhotos: Photo[] = [];
        filteredAlbums.forEach(album => {
            allPhotos.push(...(album.photos || []));
        });

        if (allPhotos.length === 0) return;

        // To remove, we send quantity 0
        const defaultProduct = products[0];
        if (!defaultProduct) return;

        const removeItems: CartItem[] = allPhotos.map(photo => ({
            id: `${photo.id}-${defaultProduct.name}`,
            photo: photo,
            quantity: 0,
            price: defaultProduct.price,
            albumId: photo.albumId,
            size: defaultProduct.name,
            mode: 'Normal',
            productId: defaultProduct.id
        }));

        onBulkUpdateCart(removeItems);
        showToast("Deselected all visible photos");
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 selection:bg-blue-500/30">
            <header className="px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center z-10 sticky top-0">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack} 
                    data-testid="back-to-home-button" 
                    className="flex items-center space-x-3 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-2xl transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="font-semibold">Home</span>
                </motion.button>
                <div className="text-center absolute left-1/2 transform -translate-x-1/2">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {roomNumber ? `Room ${roomNumber}` : 'Gallery'}
                    </h1>
                </div>
                <div className="flex justify-end items-center space-x-3">
                    {onBulkUpdateCart && (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleSelectAll}
                                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-2xl transition-colors font-semibold shadow-sm"
                            >
                                Select All
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleDeselectAll}
                                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-2xl transition-colors font-semibold shadow-sm"
                            >
                                Deselect All
                            </motion.button>
                        </>
                    )}
                    {canUseFaceSearch && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsFaceSearchOpen(true)}
                            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-500/20 font-bold border border-blue-400/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                            <span>Find Me</span>
                        </motion.button>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                <aside className="w-72 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col z-0">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 px-2">Collections</h2>
                    <nav className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {allCategories.map(cat => (
                            <motion.button
                                key={cat}
                                whileHover={{ scale: 1.02, x: 4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full text-left px-4 py-3 rounded-2xl font-semibold transition-all flex justify-between items-center ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                                    }`}
                            >
                                <span>{cat}</span>
                                {cat === 'Matched' && <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full backdrop-blur-sm">{matchedPhotos.length}</span>}
                            </motion.button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 overflow-y-auto p-8 z-0" ref={containerRef}>
                    {filteredAlbums.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400"
                        >
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-lg mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                {roomNumber
                                    ? `No photos found for Room ${roomNumber}`
                                    : 'No photos in this category'}
                            </p>
                            <p className="mt-2 text-lg">
                                {roomNumber
                                    ? 'Please check the room number or ask staff for assistance.'
                                    : 'Try selecting \'All\' to see everything.'}
                            </p>
                            {roomNumber && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onBack()}
                                    className="mt-6 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    Search Different Room
                                </motion.button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="space-y-12 pb-24">
                            {filteredAlbums.map(album => {
                                const useVirtualScrolling = (album.photos || []).length >= VIRTUAL_SCROLL_THRESHOLD;
                                const containerHeight = containerRef.current
                                    ? containerRef.current.clientHeight - 100
                                    : window.innerHeight - 300;

                                return (
                                    <motion.div 
                                        key={album.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                    >
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                                            <h3 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                                                {album.title}
                                            </h3>
                                            <span className="text-sm font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                                                {new Date(album.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {useVirtualScrolling ? (
                                            <VirtualGrid
                                                items={album.photos || []}
                                                itemWidth={220}
                                                itemHeight={220}
                                                containerHeight={containerHeight}
                                                containerWidth="100%"
                                                gap={24}
                                                minColumns={2}
                                                maxColumns={5}
                                                renderItem={(photo, index, style) => {
                                                    const isInCart = cart.some(item => item.photo.id === photo.id);
                                                    return (
                                                        <PhotoCard
                                                            key={photo.id}
                                                            photo={photo}
                                                            isInCart={isInCart}
                                                            onClick={() => onPhotoClick(photo, album)}
                                                            style={style}
                                                        />
                                                    );
                                                }}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                                {(album.photos || []).map(photo => {
                                                    const isInCart = cart.some(item => item.photo.id === photo.id);
                                                    return (
                                                        <PhotoCard
                                                            key={photo.id}
                                                            photo={photo}
                                                            isInCart={isInCart}
                                                            onClick={() => onPhotoClick(photo, album)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
            <div className="absolute bottom-8 right-8 z-50">
                <SelectionCartBar onShowCart={onShowCart} count={cartItemCount} />
            </div>

            <FaceSearchModal
                isOpen={isFaceSearchOpen}
                onClose={() => setIsFaceSearchOpen(false)}
                onSearch={handleFaceSearch}
            />
        </div>
    );
};

export default PhotoSelectionScreen;
