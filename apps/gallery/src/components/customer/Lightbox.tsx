import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Photo } from '../../types';
import PhotoMetadata from './PhotoMetadata';
import ShareModal from './ShareModal';
import { getPhotoStyle } from '../../utils/styleUtils';
import { motion, AnimatePresence } from 'framer-motion';


interface LightboxProps {
    photos: Photo[];
    startIndex: number;
    onClose: () => void;
    favoritePhotoIds: Set<string>;
    onToggleFavorite: (photoId: string) => void;
    onOpenAddToCartModal: (photo: Photo) => void;
    galleryId?: string;
}

const Lightbox: React.FC<LightboxProps> = ({
    photos,
    startIndex,
    onClose,
    favoritePhotoIds,
    onToggleFavorite,
    onOpenAddToCartModal,
    galleryId = 'default'
}) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);
    const [slideshowInterval, setSlideshowInterval] = useState(5); // seconds
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showMetadata, setShowMetadata] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lightboxRef = useRef<HTMLDivElement>(null);

    const handleNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % photos.length), [photos.length]);
    const handlePrev = useCallback(() => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length), [photos.length]);

    // Auto-hide controls logic
    const resetControlsTimeout = useCallback(() => {
        setControlsVisible(true);
        if (hideControlsTimerRef.current) {
            clearTimeout(hideControlsTimerRef.current);
        }
        hideControlsTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
        }, 3000);
    }, []);

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
        };
    }, [resetControlsTimeout]);

    // Slideshow functionality
    useEffect(() => {
        if (isSlideshowPlaying) {
            slideshowTimerRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % photos.length);
            }, slideshowInterval * 1000);
        } else {
            if (slideshowTimerRef.current) {
                clearInterval(slideshowTimerRef.current);
                slideshowTimerRef.current = null;
            }
        }

        return () => {
            if (slideshowTimerRef.current) {
                clearInterval(slideshowTimerRef.current);
            }
        };
    }, [isSlideshowPlaying, slideshowInterval, photos.length]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    exitFullscreen();
                } else {
                    onClose();
                }
            }
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                setIsSlideshowPlaying(prev => !prev);
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                if (isFullscreen) {
                    exitFullscreen();
                } else {
                    enterFullscreen();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, photos.length, isFullscreen, handleNext, handlePrev]);

    // Fullscreen API — vendor-prefixed methods are typed via src/types/globals.d.ts
    const enterFullscreen = () => {
        const el = lightboxRef.current;
        if (el) {
            if (el.requestFullscreen) {
                el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            } else if (el.mozRequestFullScreen) {
                el.mozRequestFullScreen();
            } else if (el.msRequestFullscreen) {
                el.msRequestFullscreen();
            }
            setIsFullscreen(true);
        }
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        setIsFullscreen(false);
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    const activePhoto = photos[currentIndex];
    const isFavorite = favoritePhotoIds.has(activePhoto.id);

    // Non-destructive rendering
    const editStyle = activePhoto.manualEdits ? getPhotoStyle(activePhoto.manualEdits) : { filter: undefined, transform: undefined };

    const downloadPhoto = (photo: Photo) => {
        const link = document.createElement('a');
        link.href = photo.url;
        const safeTitle = photo.title || 'Untitled';
        const fileName = safeTitle.includes('.') ? safeTitle.substring(0, safeTitle.lastIndexOf('.')) : safeTitle;
        link.download = `${fileName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progress = ((currentIndex + 1) / photos.length) * 100;

    return (
        <>
            <div
                ref={lightboxRef}
                className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center cursor-auto"
                onClick={onClose}
                onMouseMove={resetControlsTimeout}
                onTouchStart={resetControlsTimeout}
            >
                {/* Main Image Layer (Edge-to-Edge) */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="absolute inset-0 pointer-events-none z-[1]" style={{ transform: editStyle.transform }}></div>
                    <img
                        src={activePhoto.url}
                        alt={activePhoto.title}
                        className="w-full h-full object-contain select-none transition-opacity duration-300"
                        style={{
                            filter: editStyle.filter,
                            transform: editStyle.transform,
                            transformOrigin: 'center'
                        }}
                    />
                </div>

                <AnimatePresence>
                    {controlsVisible && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 pointer-events-none"
                        >
                            {/* Top Bar */}
                            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto" onClick={e => e.stopPropagation()}>
                    <div className="text-white">
                        <h3 className="font-bold">{activePhoto.title}</h3>
                        <p className="text-sm text-slate-300">{currentIndex + 1} / {photos.length}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Slideshow Controls */}
                        <div className="flex items-center space-x-2 bg-black/40 rounded-lg p-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsSlideshowPlaying(!isSlideshowPlaying); }}
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"
                                title={isSlideshowPlaying ? 'Pause slideshow (Space)' : 'Play slideshow (Space)'}
                            >
                                {isSlideshowPlaying ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                            {isSlideshowPlaying && (
                                <select
                                    value={slideshowInterval}
                                    onChange={(e) => setSlideshowInterval(Number(e.target.value))}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-black/60 text-white text-xs px-2 py-1 rounded border border-white/20"
                                >
                                    <option value={3}>3s</option>
                                    <option value={5}>5s</option>
                                    <option value={10}>10s</option>
                                </select>
                            )}
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMetadata(!showMetadata); }}
                            className={`p-2 rounded-full transition-colors ${showMetadata ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            title="Show metadata (M)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"
                            title="Share photo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); downloadPhoto(activePhoto); }}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"
                            title="Download"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenAddToCartModal(activePhoto); }}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"
                            title="Add to cart"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(activePhoto.id); }}
                            className={`p-2 rounded-full transition-colors ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            title="Favorite"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); if (isFullscreen) exitFullscreen(); else enterFullscreen(); }}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"
                            title="Fullscreen (F)"
                        >
                            {isFullscreen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white ml-4"
                            title="Close (ESC)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                            {/* Slideshow Progress Bar */}
                            {isSlideshowPlaying && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-black/40 z-20">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}

                            {/* Metadata Panel */}
                            {showMetadata && (
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 pointer-events-auto" onClick={e => e.stopPropagation()}>
                                    <div className="max-w-2xl mx-auto backdrop-blur-md bg-black/40 rounded-xl border border-white/10 overflow-hidden">
                                        <PhotoMetadata photo={activePhoto} />
                                    </div>
                                </div>
                            )}

                            {/* Navigation Arrows */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all z-20 pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                title="Previous (Left Arrow)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-all z-20 pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                                title="Next (Right Arrow)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    photo={activePhoto}
                    galleryId={galleryId}
                />
            )}
        </>
    );
};

export default Lightbox;
