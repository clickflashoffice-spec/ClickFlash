import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Heart, X, ShoppingBag, Info, Camera, Aperture, Clock, Download, Image as ImageIcon, Zap } from 'lucide-react';
import { Photo } from '../../types';
import { getPhotoStyle } from '../../utils/styleUtils';
import { extractMetadata, getImageFileSize } from '../../utils/metadataUtils';
import { logger } from '@clickflash/logger';

interface ImmersiveLightboxV2Props {
    photos: Photo[];
    startIndex: number;
    onClose: () => void;
    favoritePhotoIds: Set<string>;
    onToggleFavorite: (photoId: string) => void;
    onOpenAddToCartModal: (photo: Photo) => void;
    onShare?: (photo: Photo) => void;
}

export const ImmersiveLightboxV2: React.FC<ImmersiveLightboxV2Props> = ({
    photos,
    startIndex,
    onClose,
    favoritePhotoIds,
    onToggleFavorite,
    onOpenAddToCartModal,
    onShare
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [showMetadataDrawer, setShowMetadataDrawer] = useState(false);
    const [metadata, setMetadata] = useState<any>(null);
    const [scale, setScale] = useState(1);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [loadingMetadata, setLoadingMetadata] = useState(false);
    
    const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const activePhoto = photos[currentIndex];
    const isFavorite = favoritePhotoIds.has(activePhoto.id);

    // Auto-hide controls logic
    const resetControlsTimeout = useCallback(() => {
        setControlsVisible(true);
        if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }, []);

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
        };
    }, [resetControlsTimeout, currentIndex, scale]);

    // Load Metadata
    useEffect(() => {
        const loadMetadata = async () => {
            if (activePhoto?.url) {
                setLoadingMetadata(true);
                try {
                    const extracted = await extractMetadata(activePhoto.url);
                    const fileSize = await getImageFileSize(activePhoto.url);
                    setMetadata({ ...extracted, fileSize: fileSize || extracted?.fileSize });
                } catch (error) {
                    logger.error('Error loading metadata:', error);
                } finally {
                    setLoadingMetadata(false);
                }
            }
        };
        loadMetadata();
        setScale(1); // Reset zoom on image change
    }, [activePhoto]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showMetadataDrawer) setShowMetadataDrawer(false);
                else onClose();
            }
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, photos.length, showMetadataDrawer]);

    const handleNext = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
    const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

    const editStyle = activePhoto.manualEdits ? getPhotoStyle(activePhoto.manualEdits) : { filter: undefined, transform: undefined };

    // Pinch/Scroll to zoom handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY * -0.01;
        const newScale = Math.min(Math.max(1, scale + delta), 3);
        setScale(newScale);
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]"
            onMouseMove={resetControlsTimeout}
            onTouchStart={resetControlsTimeout}
        >
            {/* Top Action Bar */}
            <AnimatePresence>
                {controlsVisible && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent"
                    >
                        <div className="flex flex-col">
                            <span className="text-white/60 text-sm font-medium tracking-wider">
                                {currentIndex + 1} / {photos.length}
                            </span>
                            <span className="text-white font-semibold text-lg truncate max-w-xs">
                                {activePhoto.title || 'Untitled'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => setShowMetadataDrawer(!showMetadataDrawer)}
                                className={`p-2.5 rounded-full transition-colors ${showMetadataDrawer ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                title="Photo Info"
                            >
                                <Info className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onToggleFavorite(activePhoto.id)}
                                className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                            </button>
                            {onShare && (
                                <button
                                    onClick={() => onShare(activePhoto)}
                                    className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => onOpenAddToCartModal(activePhoto)}
                                className="px-4 py-2 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-colors flex items-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span className="hidden sm:inline">Order Print</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-2"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Canvas */}
            <div 
                ref={imageContainerRef}
                className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
                onWheel={handleWheel}
            >
                <AnimatePresence initial={false} custom={currentIndex}>
                    <motion.div
                        key={currentIndex}
                        custom={currentIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "tween", duration: 0.3 }}
                        className="absolute inset-0 flex items-center justify-center"
                        drag={scale > 1 ? true : "x"}
                        dragConstraints={imageContainerRef}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            if (scale === 1) {
                                const swipe = offset.x;
                                if (swipe < -50) handleNext();
                                else if (swipe > 50) handlePrev();
                            }
                        }}
                    >
                        <motion.img
                            src={activePhoto.url}
                            alt={activePhoto.title}
                            animate={{ scale }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="max-w-full max-h-full object-contain select-none cursor-grab active:cursor-grabbing"
                            style={{
                                filter: editStyle.filter,
                                transform: editStyle.transform,
                            }}
                            draggable={false}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Metadata Drawer Overlay */}
            <AnimatePresence>
                {showMetadataDrawer && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-black/60 backdrop-blur-2xl border-l border-white/10 p-6 overflow-y-auto z-40"
                    >
                        <div className="pt-20 pb-8 text-white">
                            <h3 className="text-xl font-bold mb-6">Details</h3>
                            
                            {loadingMetadata ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="h-10 bg-white/10 rounded w-full"></div>
                                    <div className="h-10 bg-white/10 rounded w-full"></div>
                                    <div className="h-10 bg-white/10 rounded w-full"></div>
                                </div>
                            ) : metadata ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        {metadata.camera && (
                                            <div className="flex flex-col gap-1 p-3 bg-white/5 rounded-xl border border-white/5">
                                                <Camera className="w-4 h-4 text-white/50" />
                                                <span className="text-sm font-medium">{metadata.camera}</span>
                                                <span className="text-xs text-white/50">Camera</span>
                                            </div>
                                        )}
                                        {metadata.lens && (
                                            <div className="flex flex-col gap-1 p-3 bg-white/5 rounded-xl border border-white/5">
                                                <Aperture className="w-4 h-4 text-white/50" />
                                                <span className="text-sm font-medium">{metadata.lens}</span>
                                                <span className="text-xs text-white/50">Lens</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <div className="flex items-center gap-3 text-white/70">
                                                <Aperture className="w-4 h-4" />
                                                <span className="text-sm">Aperture</span>
                                            </div>
                                            <span className="text-sm font-medium">{metadata.aperture || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <div className="flex items-center gap-3 text-white/70">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm">Shutter Speed</span>
                                            </div>
                                            <span className="text-sm font-medium">{metadata.shutterSpeed || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <div className="flex items-center gap-3 text-white/70">
                                                <Zap className="w-4 h-4" />
                                                <span className="text-sm">ISO</span>
                                            </div>
                                            <span className="text-sm font-medium">{metadata.iso || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <div className="flex items-center gap-3 text-white/70">
                                                <ImageIcon className="w-4 h-4" />
                                                <span className="text-sm">File Size</span>
                                            </div>
                                            <span className="text-sm font-medium">{metadata.fileSize || 'Unknown'}</span>
                                        </div>
                                        {metadata.captureDate && (
                                            <div className="flex items-center justify-between py-2 border-b border-white/10">
                                                <div className="flex items-center gap-3 text-white/70">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm">Date</span>
                                                </div>
                                                <span className="text-sm font-medium">{new Date(metadata.captureDate).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-white/50 text-sm">No EXIF metadata available for this image.</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ImmersiveLightboxV2;
