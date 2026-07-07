
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
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
        )}
        <motion.img
            layoutId={`photo-img-${photo.id}`}
            src={photo.url}
            alt={photo.title}
            onLoad={() => setIsLoaded(true)}
            data-testid="photo-card-image"
            className={`w-full h-full object-cover rounded-lg shadow-md transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
        />
        {isInCart && (
            <div className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg" aria-label="Photo in cart">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
        )}
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
            allPhotos.push(...album.photos);
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
            allPhotos.push(...album.photos);
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
        <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
            <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <button onClick={onBack} data-testid="back-to-home-button" className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-xl">Back to Home</span>
                </button>
                <div className="text-center">
                    <h1 className="text-3xl font-bold">
                        {roomNumber ? `Viewing Room: ${roomNumber}` : 'Your Photos'}
                    </h1>
                    {lastUpdateTime && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Last updated: {lastUpdateTime}</p>
                    )}
                </div>
                <div className="w-auto flex justify-end items-center space-x-3">
                    {onBulkUpdateCart && (
                        <>
                            <button
                                onClick={handleSelectAll}
                                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                                Select All
                            </button>
                            <button
                                onClick={handleDeselectAll}
                                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                                Deselect All
                            </button>
                        </>
                    )}
                    {canUseFaceSearch && (
                        <button
                            onClick={() => setIsFaceSearchOpen(true)}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                            <span className="font-bold">Find Me (AI)</span>
                        </button>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-slate-50 dark:bg-slate-800/50 p-4 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Categories</h2>
                    <nav className="space-y-2 flex-1">
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full text-left px-4 py-2 rounded-lg text-lg transition-colors flex justify-between items-center ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <span>{cat}</span>
                                {cat === 'Matched' && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{matchedPhotos.length}</span>}
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 overflow-y-auto p-6" ref={containerRef}>
                    {filteredAlbums.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-2xl font-medium">
                                {roomNumber
                                    ? `No photos found for Room ${roomNumber}.`
                                    : 'No photos found in this category.'}
                            </p>
                            <p className="mt-2">
                                {roomNumber
                                    ? 'Please check the room number or ask a photographer for assistance.'
                                    : 'Try selecting \'All\' or another category.'}
                            </p>
                            {roomNumber && (
                                <button
                                    onClick={() => onBack()}
                                    className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Search Different Room
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {filteredAlbums.map(album => {
                                const useVirtualScrolling = album.photos.length >= VIRTUAL_SCROLL_THRESHOLD;
                                const containerHeight = containerRef.current
                                    ? containerRef.current.clientHeight - 100
                                    : window.innerHeight - 300;

                                return (
                                    <div key={album.id}>
                                        <div className="flex items-baseline mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                                            <h3 className="text-2xl font-bold mr-4">
                                                {album.title}

                                            </h3>
                                            <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(album.date).toLocaleDateString()}</span>
                                        </div>
                                        {useVirtualScrolling ? (
                                            <VirtualGrid
                                                items={album.photos}
                                                itemWidth={200}
                                                itemHeight={200}
                                                containerHeight={containerHeight}
                                                containerWidth="100%"
                                                gap={16}
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
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                {album.photos.map(photo => {
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
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>
            <div className="absolute bottom-8 right-8 z-10">
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
