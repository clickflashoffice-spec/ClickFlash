import React, { useRef, useEffect, useLayoutEffect, useState, useMemo, useCallback } from 'react';
import { List } from 'react-window';
import { Photo } from '../../../types.ts';
import { logger } from '../../../utils/logger.ts';

/**
 * Filmstrip Component Props
 */
interface FilmstripProps {
    /** Array of photos to display in the filmstrip */
    photos: Photo[];
    /** Index of the currently active/selected photo */
    activePhotoIndex: number;
    /** Callback to change the active photo */
    setActivePhotoIndex: (index: number) => void;
    /** Set of selected photo IDs (for batch operations) */
    selectedPhotoIds: Set<string>;
    /** Callback to toggle selection of a photo */
    onToggleSelection: (photoId: string) => void;
    /** Callback to select all photos */
    onSelectAll: () => void;
    /** Callback to deselect all photos */
    onDeselectAll: () => void;
}

const THUMBNAIL_WIDTH = 96; // w-24 = 96px
const THUMBNAIL_HEIGHT = 64; // h-16 = 64px
const THUMBNAIL_GAP = 8; // space-x-2 = 8px
const ITEM_SIZE = THUMBNAIL_WIDTH + THUMBNAIL_GAP;
const DEFAULT_WIDTH = 800;

const Filmstrip: React.FC<FilmstripProps> = ({
    photos,
    activePhotoIndex,
    setActivePhotoIndex,
    selectedPhotoIds,
    onToggleSelection,
    onSelectAll,
    onDeselectAll
}) => {
    // Use a more generic type for the ref to avoid potential build issues with the class type
    const listRef = useRef<{ scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => void }>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_WIDTH);
    const [erroredImageIds, setErroredImageIds] = useState<Set<string>>(new Set());

    // Filter valid photos
    const validPhotos = useMemo(() => {
        if (!Array.isArray(photos)) return [];
        return photos.filter((p): p is Photo => p != null && typeof p === 'object' && p.id != null);
    }, [photos]);

    // Measure container width
    useLayoutEffect(() => {
        const measureWidth = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                if (width > 0) {
                    setContainerWidth(width);
                }
            }
        };

        measureWidth();

        const observer = new ResizeObserver(() => {
            // Wrap in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
            requestAnimationFrame(measureWidth);
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // Scroll to active photo
    useEffect(() => {
        if (listRef.current && activePhotoIndex >= 0 && activePhotoIndex < validPhotos.length) {
            listRef.current.scrollToItem(activePhotoIndex, 'smart');
        }
    }, [activePhotoIndex, validPhotos.length]);

    // Row component for react-window
    const Row = useCallback(({ index, style, data }: { index: number; style: React.CSSProperties; data: Photo[] }) => {
        try {
            // Guard against invalid style - react-window requires valid style object
            if (!style || typeof style !== 'object' || Array.isArray(style)) {
                return <div style={{ position: 'absolute', top: 0, left: 0, width: ITEM_SIZE, height: THUMBNAIL_HEIGHT }} />;
            }
            
            const safeStyle: React.CSSProperties = style;
            
            // Guard against invalid or missing data
            if (!data || !Array.isArray(data) || index < 0 || index >= data.length) {
                return <div style={safeStyle} />;
            }
            
            const photo = data[index];
            if (!photo || typeof photo !== 'object' || !photo.id) {
                return <div style={safeStyle} />;
            }

            const isSelected = selectedPhotoIds.has(photo.id);
            const isActive = index === activePhotoIndex;
            const hasError = erroredImageIds.has(photo.id);

            return (
                <div style={safeStyle} className="filmstrip-item">
                    <div className="relative flex-shrink-0 group w-24 h-16">
                        {hasError ? (
                            <div
                                className={`w-full h-full rounded border-2 flex items-center justify-center bg-slate-200 dark:bg-slate-700 cursor-pointer transition-colors
                                    ${isActive ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}
                                `}
                                onClick={() => setActivePhotoIndex(index)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && setActivePhotoIndex(index)}
                            >
                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        ) : (
                            <img
                                src={photo.url}
                                alt={photo.title || `Photo ${index + 1}`}
                                className={`w-full h-full object-cover rounded cursor-pointer border-2 transition-all
                                    ${isActive ? 'border-blue-500' : 'border-transparent group-hover:border-slate-400 dark:group-hover:border-slate-500'}
                                    ${isSelected ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-blue-500' : ''}
                                `}
                                onClick={() => setActivePhotoIndex(index)}
                                onError={() => {
                                    setErroredImageIds(prev => new Set(prev).add(photo.id));
                                    logger.warn('Failed to load photo in filmstrip', {
                                        photoId: photo.id,
                                        photoIndex: index,
                                        photoUrl: photo.url
                                    });
                                }}
                                loading="lazy"
                            />
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelection(photo.id);
                            }}
                            className={`absolute top-1 right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-xs transition-opacity shadow-sm
                                ${isSelected ? 'bg-blue-600 opacity-100' : 'bg-black/50 opacity-0 group-hover:opacity-100'}
                            `}
                            title={isSelected ? 'Deselect' : 'Select'}
                        >
                            {isSelected && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            );
        } catch (error) {
            // Log error with context for debugging
            logger.error('Error rendering filmstrip row', error instanceof Error ? error : undefined, {
                photoIndex: index,
                dataLength: Array.isArray(data) ? data.length : 0,
                style: style ? 'valid' : 'invalid'
            });
            // Return empty div to prevent crash
            return <div style={style && typeof style === 'object' && !Array.isArray(style) ? style : { position: 'absolute', top: 0, left: 0, width: ITEM_SIZE, height: THUMBNAIL_HEIGHT }} />;
        }
    }, [activePhotoIndex, selectedPhotoIds, erroredImageIds, setActivePhotoIndex, onToggleSelection]);

    // Fallback for empty state
    if (validPhotos.length === 0) {
        return (
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 text-center text-slate-500 text-sm">
                No photos available
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="flex-shrink-0 bg-white dark:bg-slate-800 p-2 border-t border-slate-200 dark:border-slate-700 h-[110px]"
        >
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {selectedPhotoIds.size} Selected
                </span>
                <div className="flex space-x-3">
                    <button
                        onClick={onSelectAll}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
                        disabled={validPhotos.length === 0}
                    >
                        Select All
                    </button>
                    <button
                        onClick={onDeselectAll}
                        className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
                        disabled={selectedPhotoIds.size === 0}
                    >
                        Deselect All
                    </button>
                </div>
            </div>

            <div className="w-full">
                {(() => {
                    // Validate List component is available
                    if (!List || typeof List !== 'function') {
                        return (
                            <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
                                Loading filmstrip component...
                            </div>
                        );
                    }

                    // Validate all props before passing to react-window
                    const height = THUMBNAIL_HEIGHT + 16;
                    const itemCount = validPhotos.length;
                    const itemSize = ITEM_SIZE;
                    const width = containerWidth > 0 ? containerWidth : DEFAULT_WIDTH;
                    const overscanCount = 5;

                    // Validate all values are valid numbers
                    if (isNaN(height) || !isFinite(height) || height <= 0 ||
                        isNaN(itemCount) || !isFinite(itemCount) || itemCount < 0 ||
                        isNaN(itemSize) || !isFinite(itemSize) || itemSize <= 0 ||
                        isNaN(width) || !isFinite(width) || width <= 0 ||
                        isNaN(overscanCount) || !isFinite(overscanCount) || overscanCount < 0) {
                        return (
                            <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
                                Calculating dimensions...
                            </div>
                        );
                    }

                    // Ensure Row is a valid function
                    if (typeof Row !== 'function') {
                        return (
                            <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
                                Initializing...
                            </div>
                        );
                    }

                    // Ensure validPhotos is a valid array
                    if (!Array.isArray(validPhotos)) {
                        return (
                            <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
                                No photos available
                            </div>
                        );
                    }

                    try {
                        return (
                            <List
                                ref={listRef}
                                height={height}
                                itemCount={itemCount}
                                itemSize={itemSize}
                                layout="horizontal"
                                width={width}
                                itemData={Array.isArray(validPhotos) ? validPhotos : []}
                                overscanCount={overscanCount}
                            >
                                {/* @ts-expect-error - react-window accepts render functions as children */}
                                {Row}
                            </List>
                        );
                    } catch (error) {
                        // Log error with full context for debugging
                        logger.error('Error rendering react-window List', error instanceof Error ? error : undefined, {
                            height,
                            itemCount,
                            itemSize,
                            width,
                            overscanCount,
                            validPhotosLength: validPhotos.length,
                            containerWidth
                        });
                        return (
                            <div className="flex items-center justify-center h-16 text-slate-400 text-sm">
                                Error loading filmstrip
                            </div>
                        );
                    }
                })()}
            </div>
        </div>
    );
};

export default React.memo(Filmstrip);