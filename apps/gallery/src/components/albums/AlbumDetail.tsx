
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Album, Photo, PhotoCategory, ManualEdits } from '../../types.ts';
import EditorSidebar from './editor/EditorSidebar';
import Filmstrip from './editor/Filmstrip';
import { editImageWithAI } from '../../services/geminiService.ts';
import { urlToInlineData } from '../../utils/imageUtils.ts';
import { webSocketService } from '../../services/webSocketService.ts';
import { apiService } from '../../services/apiService.ts';
import ConfirmationModal from '../common/ConfirmationModal.tsx';
import Spinner from '../common/Spinner.tsx';
import { pb } from '../../services/pb.ts';
import { logger } from '../../utils/logger.ts';
import { TIMEOUTS } from '../../constants/timing.ts';

interface AlbumDetailProps {
    albumId: string;
    onBack: () => void;
    onFinalizeSuccess: () => void;
    onSave: (album: Album) => void;
    showToast: (message: string) => void;
    isOnline: boolean;
}

const initialEdits: ManualEdits = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    saturate: 0,
    vibrance: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    whites: 0,
    blacks: 0,
    soften: 0,
    rotate: 0,
    straighten: 0,
    perspectiveX: 0,
    perspectiveY: 0,
    clarity: 0,
    dropShadow: 0,
};

type FilterName = 'vintage' | 'cool' | 'warm' | 'sepia' | 'blackAndWhite';
type SaveStatus = 'idle' | 'modified' | 'saving' | 'saved' | 'error';
type DragAction = 'move' | 'resize';
type Handle = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'move';

interface CropBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * AlbumDetail Component
 * 
 * Main component for viewing and editing album details and photos.
 * 
 * Features:
 * - Photo editing with manual adjustments (exposure, contrast, etc.)
 * - Batch photo operations (copy/paste edits, delete, categorize)
 * - Auto-save with debouncing
 * - Optimistic locking for conflict detection
 * - Photo cropping and rotation
 * - AI-powered generative editing (when online)
 * - Album finalization workflow
 * - Real-time sync with kiosks via WebSocket
 * 
 * @param {AlbumDetailProps} props - Component props
 * @param {string} props.albumId - ID of the album to display/edit
 * @param {() => void} props.onBack - Callback when user navigates back
 * @param {() => void} props.onFinalizeSuccess - Callback when album is finalized
 * @param {(album: Album) => void} props.onSave - Callback when album is saved
 * @param {(message: string) => void} props.showToast - Function to show toast notifications
 * @param {boolean} props.isOnline - Whether the app is online (for AI features)
 */
const AlbumDetail: React.FC<AlbumDetailProps> = ({ albumId, onBack, onFinalizeSuccess, onSave, showToast, isOnline }) => {
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [pristineAlbum, setPristineAlbum] = useState<Album | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
    const [editingState, setEditingState] = useState({ inProgress: false, message: '' });
    const [copiedEdits, setCopiedEdits] = useState<ManualEdits | null>(null);
    const debounceTimeout = useRef<number | null>(null);
    
    // Zoom & Pan state
    const [zoomState, setZoomState] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const viewerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const cropOverlayRef = useRef<HTMLDivElement>(null);

    // Cropping state
    const [isCropping, setIsCropping] = useState(false);
    const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
    const [dragState, setDragState] = useState<{ action: DragAction; handle: Handle; startX: number; startY: number; startBox: CropBox; } | null>(null);

    // History state for undo/redo
    const [history, setHistory] = useState<Album[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const albumForCleanup = useRef<Album | null>(null);
    useEffect(() => {
        albumForCleanup.current = album;
    }, [album]);

    // Revoke object URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (albumForCleanup.current) {
                albumForCleanup.current.photos.forEach(p => {
                    if (p.url && p.url.startsWith('blob:')) {
                        URL.revokeObjectURL(p.url);
                    }
                });
            }
        };
    }, []);
    
    useEffect(() => {
        const loadAlbum = async () => {
            setLoading(true);
            try {
                const fetchedAlbum = await apiService.getAlbum(albumId);
                 if (fetchedAlbum && typeof fetchedAlbum === 'object') {
                    // Safely process photos, filtering out any null/undefined entries
                    const safePhotos = (fetchedAlbum.photos || [])
                        .filter((p): p is Photo => p != null && typeof p === 'object')
                        .map(p => {
                            // Safely handle manualEdits - ensure it's always an object
                            let safeManualEdits = initialEdits;
                            if (p?.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) {
                                try {
                                    // Safely spread manualEdits, handling null/undefined values
                                    const manualEditsObj = p.manualEdits || {};
                                    safeManualEdits = { ...initialEdits, ...manualEditsObj };
                                } catch (e) {
                                    // If spreading fails, use initialEdits
                                    safeManualEdits = initialEdits;
                                }
                            }
                            return {
                                id: p.id || '',
                                albumId: p.albumId || '',
                                title: p.title || '',
                                url: p.url || '',
                                photographerId: p.photographerId || null,
                                category: p.category || null,
                                manualEdits: safeManualEdits
                            };
                        });
                    
                    // Safely construct album object, ensuring all properties are defined
                    const albumWithInitialEdits: Album = {
                        id: fetchedAlbum.id || '',
                        title: fetchedAlbum.title || '',
                        date: fetchedAlbum.date || '',
                        photographerId: fetchedAlbum.photographerId || null,
                        coverPhotoUrl: fetchedAlbum.coverPhotoUrl || '',
                        source: fetchedAlbum.source || '',
                        roomNumber: fetchedAlbum.roomNumber || '',
                        status: fetchedAlbum.status || '',
                        categories: Array.isArray(fetchedAlbum.categories) ? fetchedAlbum.categories : [],
                        photos: safePhotos
                    };
                    
                    // Safely clone album for pristine state and history
                    // Use a custom deep clone function that handles edge cases
                    try {
                        // Clean the object before stringifying to avoid circular references
                        const cleanAlbum = {
                            id: albumWithInitialEdits.id,
                            title: albumWithInitialEdits.title,
                            date: albumWithInitialEdits.date,
                            photographerId: albumWithInitialEdits.photographerId,
                            coverPhotoUrl: albumWithInitialEdits.coverPhotoUrl,
                            source: albumWithInitialEdits.source,
                            roomNumber: albumWithInitialEdits.roomNumber,
                            status: albumWithInitialEdits.status,
                            categories: albumWithInitialEdits.categories,
                            photos: albumWithInitialEdits.photos.map(p => ({
                                id: p.id,
                                albumId: p.albumId,
                                title: p.title,
                                url: p.url,
                                photographerId: p.photographerId,
                                category: p.category,
                                manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                            }))
                        };
                        const clonedAlbum = JSON.parse(JSON.stringify(cleanAlbum)) as Album;
                        setAlbum(albumWithInitialEdits);
                        setPristineAlbum(clonedAlbum);
                        setHistory([clonedAlbum]);
                    } catch (cloneError) {
                        // If cloning fails, use the original object
                        logger.warn('Failed to clone album for history', cloneError);
                        setAlbum(albumWithInitialEdits);
                        setPristineAlbum(albumWithInitialEdits);
                        setHistory([albumWithInitialEdits]);
                    }
                    setHistoryIndex(0);
                    setActivePhotoIndex(0);
                    setSelectedPhotoIds(new Set());
                 } else {
                    // Album not found or invalid data
                    if (fetchedAlbum === null) {
                        throw new Error('Album not found. The album may have been deleted or the ID is invalid.');
                    } else {
                        throw new Error('Invalid album data received from server.');
                    }
                 }
            } catch (error) {
                logger.error("Failed to load album", error instanceof Error ? error : undefined, { albumId });
                
                // Provide more specific error messages based on error type
                let errorMessage = "Error: Could not load album details.";
                if (error instanceof Error) {
                    const errorText = error.message.toLowerCase();
                    if (errorText.includes('network') || errorText.includes('connection') || errorText.includes('fetch')) {
                        errorMessage = "Network error: Unable to connect to the server. Please check your connection and try again.";
                    } else if (errorText.includes('not found') || errorText.includes('404')) {
                        errorMessage = "Album not found. The album may have been deleted or moved.";
                    } else if (errorText.includes('permission') || errorText.includes('unauthorized') || errorText.includes('403')) {
                        errorMessage = "Permission denied: You do not have access to this album.";
                    } else if (error.message) {
                        errorMessage = `Error: ${error.message}`;
                    }
                }
                
                showToast(errorMessage);
            } finally {
                setLoading(false);
            }
        };
        loadAlbum();
    }, [albumId, showToast]);

    useEffect(() => {
        // Reset zoom and pan when photo changes
        setZoomState({ scale: 1, offsetX: 0, offsetY: 0 });
    }, [activePhotoIndex]);

    /**
     * Update album state with history tracking
     * 
     * Safely updates album state and maintains edit history for undo/redo.
     * 
     * Features:
     * - Deep cloning for safe state updates
     * - History tracking (up to 50 entries)
     * - Automatic history recording on state changes
     * - Safe handling of photo arrays and manual edits
     * 
     * @param {Function} updater - Function that modifies the draft album
     * @param {boolean} recordHistory - Whether to record this change in history (default: true)
     */
    const updateAlbumState = useCallback((updater: (draft: Album) => void, recordHistory = true) => {
        setAlbum(currentAlbum => {
            if (!currentAlbum || typeof currentAlbum !== 'object') return null;
            
            // Safely clone album with try-catch for JSON operations
            let draft: Album;
            try {
                // Clean the object before stringifying to avoid issues
                const cleanAlbum = {
                    id: currentAlbum.id,
                    title: currentAlbum.title,
                    date: currentAlbum.date,
                    photographerId: currentAlbum.photographerId,
                    coverPhotoUrl: currentAlbum.coverPhotoUrl,
                    source: currentAlbum.source,
                    roomNumber: currentAlbum.roomNumber,
                    status: currentAlbum.status,
                    categories: Array.isArray(currentAlbum.categories) ? currentAlbum.categories : [],
                    photos: (currentAlbum.photos || []).map(p => ({
                        id: p.id,
                        albumId: p.albumId,
                        title: p.title,
                        url: p.url,
                        photographerId: p.photographerId,
                        category: p.category,
                        manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                    }))
                };
                draft = JSON.parse(JSON.stringify(cleanAlbum)) as Album;
                // Ensure photos array exists and is safe
                if (!draft.photos || !Array.isArray(draft.photos)) {
                    draft.photos = [];
                }
            } catch (cloneError) {
                // If deep clone fails, create shallow copy with safe photo array
                logger.warn('Failed to deep clone album, using shallow copy', cloneError);
                draft = {
                    id: currentAlbum.id || '',
                    title: currentAlbum.title || '',
                    date: currentAlbum.date || '',
                    photographerId: currentAlbum.photographerId || null,
                    coverPhotoUrl: currentAlbum.coverPhotoUrl || '',
                    source: currentAlbum.source || '',
                    roomNumber: currentAlbum.roomNumber || '',
                    status: currentAlbum.status || '',
                    categories: Array.isArray(currentAlbum.categories) ? currentAlbum.categories : [],
                    photos: (currentAlbum.photos || []).map(p => ({
                        id: p.id,
                        albumId: p.albumId,
                        title: p.title,
                        url: p.url,
                        photographerId: p.photographerId,
                        category: p.category,
                        manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                    }))
                };
            }
            
            // Ensure draft.photos is always an array before calling updater
            if (!draft.photos || !Array.isArray(draft.photos)) {
                draft.photos = [];
            }
            
            updater(draft);
            
            if (recordHistory) {
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(draft);
                
                // Limit history size to prevent memory issues (keep last 50 entries)
                const MAX_HISTORY_SIZE = 50;
                if (newHistory.length > MAX_HISTORY_SIZE) {
                    newHistory.shift(); // Remove oldest entry
                }
                
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
            }
            return draft;
        });
    }, [history, historyIndex]);

    // Safely get active photo with validation
    const activePhoto = useMemo(() => {
        if (!album || !album.photos || !Array.isArray(album.photos)) {
            return null;
        }
        if (activePhotoIndex < 0 || activePhotoIndex >= album.photos.length) {
            return null;
        }
        const photo = album.photos[activePhotoIndex];
        // Validate photo object
        if (!photo || typeof photo !== 'object' || !photo.id) {
            return null;
        }
        return photo;
    }, [album, activePhotoIndex]);

    const isDirty = useMemo(() => {
        if (!album || !pristineAlbum || typeof album !== 'object' || typeof pristineAlbum !== 'object') return false;
        try {
            // Safely stringify both albums, handling any problematic values
            const cleanAlbum = {
                id: album.id,
                title: album.title,
                date: album.date,
                photographerId: album.photographerId,
                coverPhotoUrl: album.coverPhotoUrl,
                source: album.source,
                roomNumber: album.roomNumber,
                status: album.status,
                categories: Array.isArray(album.categories) ? album.categories : [],
                photos: (album.photos || []).map(p => ({
                    id: p.id,
                    albumId: p.albumId,
                    title: p.title,
                    url: p.url,
                    photographerId: p.photographerId,
                    category: p.category,
                    manualEdits: p.manualEdits || {}
                }))
            };
            const cleanPristine = {
                id: pristineAlbum.id,
                title: pristineAlbum.title,
                date: pristineAlbum.date,
                photographerId: pristineAlbum.photographerId,
                coverPhotoUrl: pristineAlbum.coverPhotoUrl,
                source: pristineAlbum.source,
                roomNumber: pristineAlbum.roomNumber,
                status: pristineAlbum.status,
                categories: Array.isArray(pristineAlbum.categories) ? pristineAlbum.categories : [],
                photos: (pristineAlbum.photos || []).map(p => ({
                    id: p.id,
                    albumId: p.albumId,
                    title: p.title,
                    url: p.url,
                    photographerId: p.photographerId,
                    category: p.category,
                    manualEdits: p.manualEdits || {}
                }))
            };
            return JSON.stringify(cleanAlbum) !== JSON.stringify(cleanPristine);
        } catch (error) {
            logger.warn('Failed to compare albums for isDirty check', error);
            return false;
        }
    }, [album, pristineAlbum]);
    
    /**
     * Save album changes to the backend
     * 
     * Features:
     * - Automatic retry logic for network failures (up to 3 retries)
     * - Optimistic locking using updatedAt timestamp
     * - Conflict detection and user-friendly error messages
     * - Save status tracking (saving, saved, error)
     * - Automatic state synchronization after save
     * 
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<void>}
     */
    const handleSaveChanges = useCallback(async (retryCount = 0) => {
        if (!album) return;
        
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second
        
        try {
            setSaveStatus('saving');
            
            // Include updatedAt for optimistic locking if available
            const albumToSave = { ...album } as any;
            if ((pristineAlbum as any)?.updatedAt || (pristineAlbum as any)?.updated_at) {
                albumToSave.updated_at = (pristineAlbum as any).updated_at || (pristineAlbum as any).updatedAt;
            }
            if ((album as any)?.updated_at) {
                albumToSave.updated_at = (album as any).updated_at;
            }
            
            const savedAlbum = await apiService.updateAlbum(album.id, albumToSave);
            onSave(savedAlbum); // Propagate change up
            
            // Safely clone saved album for pristine state
            try {
                const cleanSavedAlbum = {
                    id: savedAlbum.id || '',
                    title: savedAlbum.title || '',
                    date: savedAlbum.date || '',
                    photographerId: savedAlbum.photographerId || null,
                    coverPhotoUrl: savedAlbum.coverPhotoUrl || '',
                    source: savedAlbum.source || '',
                    roomNumber: savedAlbum.roomNumber || '',
                    status: savedAlbum.status || '',
                    categories: Array.isArray(savedAlbum.categories) ? savedAlbum.categories : [],
                    photos: (savedAlbum.photos || []).map(p => ({
                        id: p.id,
                        albumId: p.albumId,
                        title: p.title,
                        url: p.url,
                        photographerId: p.photographerId,
                        category: p.category,
                        manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                    })),
                    updatedAt: (savedAlbum as any).updatedAt || (savedAlbum as any).updated_at,
                    updated_at: (savedAlbum as any).updated_at || (savedAlbum as any).updatedAt
                };
                setPristineAlbum(JSON.parse(JSON.stringify(cleanSavedAlbum)) as Album);
            } catch (cloneError) {
                logger.warn('Failed to clone saved album for pristine state', cloneError);
                setPristineAlbum(savedAlbum);
            }
            setSaveStatus('saved');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isConflict = errorMessage.includes('conflict') || errorMessage.includes('modified');
            const isNetworkError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
            
            logger.error("Failed to save changes", error instanceof Error ? error : undefined, { 
                albumId: album?.id,
                retryCount,
                isConflict,
                isNetworkError
            });
            
            // Retry logic for network errors or transient failures
            if (retryCount < MAX_RETRIES && (isNetworkError || (!isConflict && retryCount < 2))) {
                logger.info(`Retrying save operation (attempt ${retryCount + 1}/${MAX_RETRIES})`, { albumId: album?.id });
                setTimeout(() => {
                    handleSaveChanges(retryCount + 1);
                }, RETRY_DELAY * (retryCount + 1)); // Exponential backoff
                return;
            }
            
            // For conflict errors, show user-friendly message
            if (isConflict) {
                showToast('This album was modified by another user. Please refresh and try again.');
            } else {
                showToast('Failed to save changes. Please check your connection and try again.');
            }
            
            setSaveStatus('error');
        }
    }, [album, onSave, pristineAlbum, showToast]);
    
    useEffect(() => {
        if (isDirty) {
            setSaveStatus('modified');
        } else {
            if (saveStatus !== 'saving' && saveStatus !== 'saved') {
                setSaveStatus('idle');
            }
        }
    }, [isDirty, saveStatus]);

    useEffect(() => {
        if (saveStatus === 'modified' && album) {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = window.setTimeout(() => {
                setSaveStatus('saving');
                handleSaveChanges();
            }, TIMEOUTS.AUTO_SAVE_DEBOUNCE); // Auto-save debounce
        }
        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, [saveStatus, album, handleSaveChanges]);

    useEffect(() => {
        if (saveStatus === 'saved' || saveStatus === 'error') {
            const timer = setTimeout(() => {
                if (!isDirty) {
                    setSaveStatus('idle');
                }
            }, TIMEOUTS.SAVE_STATUS_DISPLAY);
            return () => clearTimeout(timer);
        }
    }, [saveStatus, isDirty]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Z or Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (historyIndex > 0 && history.length > 0) {
                    handleUndo();
                }
            }
            // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (historyIndex < history.length - 1 && history.length > 0) {
                    handleRedo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [historyIndex, history.length]);

    const handleBackWithCheck = () => {
        if (saveStatus === 'modified' || saveStatus === 'saving') {
            if (window.confirm("Changes are being saved. Are you sure you want to go back? The latest changes might be lost.")) {
                onBack();
            }
        } else {
            onBack();
        }
    };

    /**
     * Handle manual photo edit changes
     * 
     * Applies edit adjustments (exposure, contrast, etc.) to selected photos.
     * Changes are saved automatically via the album auto-save mechanism.
     * 
     * @param {Partial<ManualEdits>} updates - Edit adjustments to apply
     */
    /**
     * Handle manual photo edit changes
     * 
     * Applies edit adjustments (exposure, contrast, saturation, etc.) to selected photos.
     * Changes are saved automatically via the album auto-save mechanism.
     * Supports batch editing when multiple photos are selected.
     * 
     * Edit Validation:
     * - Ensures values are within valid ranges
     * - Clamps values to min/max bounds
     * - Validates edit structure
     * 
     * @param {Partial<ManualEdits>} updates - Edit adjustments to apply (e.g., { exposure: 10, contrast: 5 })
     */
    const handleManualEditChange = (updates: Partial<ManualEdits>) => {
        const idsToUpdate = selectedPhotoIds.size > 0 ? selectedPhotoIds : (activePhoto ? new Set([activePhoto.id]) : new Set());
        if (idsToUpdate.size === 0) return;

        // Validate edit values
        const validatedUpdates: Partial<ManualEdits> = {};
        Object.keys(updates).forEach(key => {
            const value = updates[key as keyof ManualEdits];
            if (typeof value === 'number') {
                // Clamp values to valid ranges based on edit type
                let min = -100;
                let max = 100;
                
                if (key === 'hueRotate') {
                    min = 0;
                    max = 360;
                } else if (key === 'rotate') {
                    min = -180;
                    max = 180;
                } else if (key === 'straighten') {
                    min = -15;
                    max = 15;
                } else if (key === 'clarity' || key === 'grayscale' || key === 'sepia' || key === 'invert' || key === 'dropShadow') {
                    min = 0;
                    max = 100;
                } else if (key === 'soften') {
                    min = 0;
                    max = 20;
                }
                
                validatedUpdates[key as keyof ManualEdits] = Math.max(min, Math.min(max, value)) as any;
            }
        });

        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (idsToUpdate.has(p.id)) {
                    const currentEdits = (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits))
                        ? p.manualEdits
                        : initialEdits;
                    p.manualEdits = { ...currentEdits, ...validatedUpdates };
                }
            });
        });
    };
    
    const confirmSendToKiosk = async () => {
        setIsFinalizeModalOpen(false);
        if (!album || selectedPhotoIds.size === 0) {
            showToast("Please select at least one photo to send.");
            return;
        }

        setEditingState({ inProgress: true, message: 'Finalizing and Uploading...' });

        try {
            // 1. Legacy WebSocket Broadcast (Blob transfer)
            const photoBlobs = await apiService.getPhotoBlobs(Array.from(selectedPhotoIds));
            if (!album || typeof album !== 'object') {
                showToast("Error: Invalid album data.");
                return;
            }
            
            const albumToSend: Album = {
                id: album.id || '',
                title: album.title || '',
                date: album.date || '',
                photographerId: album.photographerId || null,
                coverPhotoUrl: album.coverPhotoUrl || '',
                source: album.source || '',
                roomNumber: album.roomNumber || '',
                status: album.status || '',
                categories: Array.isArray(album.categories) ? album.categories : [],
                photos: (album.photos || [])
                    .filter(p => p && selectedPhotoIds.has(p.id))
                    .map(p => ({
                        id: p.id,
                        albumId: p.albumId,
                        title: p.title,
                        url: photoBlobs[p.id] || p.url || '',
                        photographerId: p.photographerId,
                        category: p.category,
                        manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                    })), 
            };

            webSocketService.sendMessage({
                type: 'NEW_ALBUM_FOR_KIOSK',
                payload: albumToSend,
            });

            // 2. PocketBase Upload (Robust HTTP transfer)
            try {
                // Check if album exists in PB first (by title/date combination)
                // Simplified: Just creating new for now, real app would check uniqueness
                const pbAlbum = await pb.collection('albums').create({
                    title: album.title,
                    date: new Date(album.date),
                    photographerId: album.photographerId,
                    roomNumber: album.roomNumber,
                    status: 'Finalized'
                });

                // Upload photos
                const selectedPhotos = (album?.photos || []).filter(p => selectedPhotoIds.has(p.id));
                for (const photo of selectedPhotos) {
                    const blob = photoBlobs[photo.id];
                    if (blob) {
                        const formData = new FormData();
                        formData.append('title', photo.title);
                        formData.append('albumId', pbAlbum.id);
                        formData.append('photographerId', String(album.photographerId));
                        formData.append('url', blob, 'photo.jpg');
                        await pb.collection('photos').create(formData);
                    }
                }
                logger.info("Successfully uploaded to PocketBase", { albumId: album.id });
            } catch (pbError) {
                logger.warn("PocketBase upload failed (App might be in legacy mode or DB offline)", { albumId: album.id, error: pbError });
                // Don't block finalization if PB fails, fallback to WebSocket
            }

            await apiService.deleteAlbum(album.id);
            showToast(`Album "${album.title}" sent and finalized!`);
            onFinalizeSuccess();

        } catch (error) {
            showToast('Error finalizing album. Please try again.');
            logger.error("Failed to finalize album", error instanceof Error ? error : undefined, { albumId: album?.id });
        } finally {
            setEditingState({ inProgress: false, message: '' });
        }
    };

    const handleSendToKiosk = () => {
        if (isDirty || saveStatus === 'modified' || saveStatus === 'saving') {
            showToast("Please wait for all changes to be saved before sending to the kiosk.");
            return;
        }
        if (selectedPhotoIds.size > 0) {
            setIsFinalizeModalOpen(true);
        } else {
             showToast("Please select at least one photo to send.");
        }
    };
    
    const getPhotoStyle = (photo: Photo): any => {
        // Safely handle manualEdits - ensure it's always an object
        if (!photo || typeof photo !== 'object') {
            return { filter: 'none', transform: 'none' };
        }
        
        let safeEdits = {};
        try {
            if (photo.manualEdits != null && typeof photo.manualEdits === 'object' && !Array.isArray(photo.manualEdits)) {
                safeEdits = photo.manualEdits;
            }
        } catch (e) {
            // If accessing manualEdits fails, use empty object
            safeEdits = {};
        }
        
        const edits = { ...initialEdits, ...safeEdits };
        const {
            exposure = 0, contrast = 0, highlights = 0, shadows = 0,
            saturate = 0, vibrance = 0, grayscale = 0, sepia = 0, invert = 0,
            hueRotate = 0, temperature = 0, tint = 0, whites = 0, blacks = 0,
            soften = 0, rotate = 0, straighten = 0, perspectiveX = 0, perspectiveY = 0,
            clarity = 0, dropShadow = 0
        } = edits;

        // Calculate brightness with whites/blacks adjustments
        const whitesAdjust = whites / 200;
        const blacksAdjust = blacks / 200;
        const brightness = 1 + (exposure / 100) + (highlights / 200) + (shadows / 400) + whitesAdjust - blacksAdjust;
        const contrastVal = 1 + (contrast / 100) + (highlights / 500) - (shadows / 500) + (clarity / 200);

        // Vibrance affects less-saturated colors more than saturation
        const vibranceAmount = vibrance / 100;
        const saturateAmount = 1 + saturate / 100;
        const combinedSaturate = vibranceAmount !== 0 
            ? saturateAmount + (vibranceAmount > 0 ? vibranceAmount * 0.5 : vibranceAmount * 0.25)
            : saturateAmount;

        // Temperature adjustment (warm/cool) using color matrix approximation
        // Positive = warm (more red/yellow), Negative = cool (more blue)
        const tempAmount = temperature / 100;
        const tempR = 1 + Math.max(0, tempAmount * 0.3);
        const tempB = 1 + Math.max(0, -tempAmount * 0.3);

        // Tint adjustment (green/magenta) using color matrix
        const tintAmount = tint / 100;
        const tintG = 1 + Math.max(0, -tintAmount * 0.3);
        const tintM = 1 + Math.max(0, tintAmount * 0.3);

        const filters = [
            `brightness(${brightness})`,
            `contrast(${contrastVal})`,
            `saturate(${combinedSaturate})`,
        ];

        // Apply temperature and tint using color matrix if needed
        if (temperature !== 0 || tint !== 0) {
            const matrix = [
                tempR * (tintG > 1 ? 1 - (tintG - 1) : 1), 0, 0, 0, 0,
                0, tintG, 0, 0, 0,
                0, 0, tempB * (tintM > 1 ? 1 - (tintM - 1) : 1), 0, 0,
                0, 0, 0, 1, 0
            ];
            filters.push(`contrast(1)`); // Reset contrast before matrix
            filters.push(`brightness(1)`); // Reset brightness before matrix
            // Use a simpler approach: combine with existing filters
            if (temperature !== 0) {
                filters.push(`sepia(${Math.abs(temperature) * 0.5}%)`);
            }
        }

        filters.push(
            `grayscale(${grayscale}%)`,
            `sepia(${sepia}%)`,
            `invert(${invert}%)`,
            `hue-rotate(${hueRotate}deg)`,
            `blur(${soften}px)`,
        );

        if (dropShadow > 0) {
            filters.push(`drop-shadow(0 4px ${dropShadow}px rgba(0,0,0,0.5))`);
        }

        // Calculate scale-to-fit for straighten to prevent edge cropping
        const angle = rotate + straighten;
        let transformStr = '';
        
        // Scale-to-fit calculation for straighten - ensures rotated image fits within bounds
        if (straighten !== 0) {
            const rad = Math.abs(straighten * Math.PI / 180);
            const cos = Math.abs(Math.cos(rad));
            const sin = Math.abs(Math.sin(rad));
            // Calculate scale factor: for a square rotated, need to fit diagonal
            // For any rectangle: scale = 1 / (cos + sin) ensures it fits
            // This is a conservative approximation that works well for small angles
            const scale = 1 / (cos + sin);
            transformStr = `rotate(${angle}deg) scale(${scale})`;
        } else if (rotate !== 0) {
            transformStr = `rotate(${angle}deg)`;
        }

        // Add perspective correction
        const perspectiveParts: string[] = [];
        if (perspectiveX !== 0 || perspectiveY !== 0) {
            const perspectiveValue = 1000 + Math.abs(perspectiveX) * 10;
            const rotateX = perspectiveY * 0.1;
            const rotateY = perspectiveX * 0.1;
            if (rotateY !== 0) perspectiveParts.push(`perspective(${perspectiveValue}px)`);
            if (rotateX !== 0 || rotateY !== 0) {
                perspectiveParts.push(`rotateX(${rotateX}deg)`);
                perspectiveParts.push(`rotateY(${rotateY}deg)`);
            }
        }

        if (perspectiveParts.length > 0) {
            transformStr = perspectiveParts.join(' ') + (transformStr ? ' ' + transformStr : '');
        } else if (!transformStr) {
            transformStr = 'none';
        }

        return {
            filter: filters.join(' '),
            transform: transformStr,
        };
    };

    /**
     * Undo the last edit operation
     * 
     * Restores the album state to the previous history entry.
     * Supports undo chain for multiple operations.
     * 
     * History Management:
     * - Maintains a history array of album states
     * - Tracks current position in history
     * - Automatically records history on state changes
     * - Maximum history size: 50 entries (to prevent memory issues)
     */
    const handleUndo = () => {
        if (historyIndex > 0 && history.length > 0) {
            const newIndex = historyIndex - 1;
            const historyAlbum = history[newIndex];
            if (historyAlbum && typeof historyAlbum === 'object') {
                try {
                    // Safely clone history album
                    const cleanHistoryAlbum = {
                        id: historyAlbum.id || '',
                        title: historyAlbum.title || '',
                        date: historyAlbum.date || '',
                        photographerId: historyAlbum.photographerId || null,
                        coverPhotoUrl: historyAlbum.coverPhotoUrl || '',
                        source: historyAlbum.source || '',
                        roomNumber: historyAlbum.roomNumber || '',
                        status: historyAlbum.status || '',
                        categories: Array.isArray(historyAlbum.categories) ? historyAlbum.categories : [],
                        photos: (historyAlbum.photos || []).map(p => ({
                            id: p.id,
                            albumId: p.albumId,
                            title: p.title,
                            url: p.url,
                            photographerId: p.photographerId,
                            category: p.category,
                            manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                        }))
                    };
                    const cloned = JSON.parse(JSON.stringify(cleanHistoryAlbum)) as Album;
                    setHistoryIndex(newIndex);
                    setAlbum(cloned);
                    logger.debug('Undo operation completed', { historyIndex: newIndex, historyLength: history.length });
                } catch (error) {
                    logger.warn('Failed to restore from history', error);
                    setHistoryIndex(newIndex);
                    setAlbum(historyAlbum);
                }
            }
        }
    };
    
    /**
     * Redo the last undone operation
     * 
     * Restores the album state to the next history entry after an undo.
     * Only available if undo has been performed.
     */
    const handleRedo = () => {
        if (historyIndex < history.length - 1 && history.length > 0) {
            const newIndex = historyIndex + 1;
            const historyAlbum = history[newIndex];
            if (historyAlbum && typeof historyAlbum === 'object') {
                try {
                    // Safely clone history album
                    const cleanHistoryAlbum = {
                        id: historyAlbum.id || '',
                        title: historyAlbum.title || '',
                        date: historyAlbum.date || '',
                        photographerId: historyAlbum.photographerId || null,
                        coverPhotoUrl: historyAlbum.coverPhotoUrl || '',
                        source: historyAlbum.source || '',
                        roomNumber: historyAlbum.roomNumber || '',
                        status: historyAlbum.status || '',
                        categories: Array.isArray(historyAlbum.categories) ? historyAlbum.categories : [],
                        photos: (historyAlbum.photos || []).map(p => ({
                            id: p.id,
                            albumId: p.albumId,
                            title: p.title,
                            url: p.url,
                            photographerId: p.photographerId,
                            category: p.category,
                            manualEdits: (p.manualEdits && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits)) 
                            ? { ...initialEdits, ...p.manualEdits } as ManualEdits
                            : initialEdits
                        }))
                    };
                    const cloned = JSON.parse(JSON.stringify(cleanHistoryAlbum)) as Album;
                    setHistoryIndex(newIndex);
                    setAlbum(cloned);
                    logger.debug('Redo operation completed', { historyIndex: newIndex, historyLength: history.length });
                } catch (error) {
                    logger.warn('Failed to restore from history (redo)', error);
                    setHistoryIndex(newIndex);
                    setAlbum(historyAlbum);
                }
            }
        }
    };
    
    const handleAIEdit = async (prompt: string) => {
        const idsToEdit = selectedPhotoIds.size > 0 ? Array.from(selectedPhotoIds) : (activePhoto ? [activePhoto.id] : []);
        if (idsToEdit.length === 0) return;

        setEditingState({ inProgress: true, message: `Applying AI Edit (0/${idsToEdit.length})...` });

        for (let i = 0; i < idsToEdit.length; i++) {
            const photoId = idsToEdit[i];
            const photoToEdit = album?.photos.find(p => p.id === photoId);
            if (!photoToEdit) continue;
            
            setEditingState({ inProgress: true, message: `Applying AI Edit (${i + 1}/${idsToEdit.length})...` });

            try {
                const { mimeType, data } = await urlToInlineData(photoToEdit.url);
                const result = await editImageWithAI(data, mimeType, prompt);
                
                updateAlbumState(draft => {
                    const photoInDraft = draft.photos.find((p: Photo) => p.id === photoId);
                    if (photoInDraft) {
                        photoInDraft.url = `data:${result.mimeType};base64,${result.data}`;
                    }
                }, i === idsToEdit.length - 1);
            } catch (error) {
                logger.error(`Failed to AI edit photo ${photoId}`, error instanceof Error ? error : undefined, { photoId, photoTitle: photoToEdit.title });
                showToast(`Error editing photo: ${photoToEdit.title}`);
                break;
            }
        }
        setEditingState({ inProgress: false, message: '' });
    };

    const handleQuickRotate = (direction: 'left' | 'right') => {
        const idsToUpdate = selectedPhotoIds.size > 0 ? selectedPhotoIds : (activePhoto ? new Set([activePhoto.id]) : new Set());
        if (idsToUpdate.size === 0) return;
        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (idsToUpdate.has(p.id)) {
                    const currentEdits = (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits))
                        ? p.manualEdits
                        : initialEdits;
                    const currentRotation = currentEdits.rotate || 0;
                    p.manualEdits = { ...currentEdits, rotate: currentRotation + (direction === 'left' ? -90 : 90) };
                }
            });
        });
    };

    const handleCategorizeSelected = (category: PhotoCategory) => {
        if (selectedPhotoIds.size === 0) return;
        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (selectedPhotoIds.has(p.id)) {
                    p.category = category;
                }
            });
        });
        showToast(`Categorized ${selectedPhotoIds.size} photos as ${category}.`);
    };

    const confirmDeleteSelected = () => {
        if (selectedPhotoIds.size === 0 || !album) return;

        const originalPhotos = album?.photos || [];
        const activePhotoId = originalPhotos[activePhotoIndex]?.id;
        
        const remainingPhotos = originalPhotos.filter(p => !selectedPhotoIds.has(p.id));
        
        let newActiveIndex = 0;
        if (remainingPhotos.length > 0) {
            if (activePhotoId && selectedPhotoIds.has(activePhotoId)) {
                newActiveIndex = Math.min(activePhotoIndex, remainingPhotos.length - 1);
            } else if (activePhotoId) {
                const foundIndex = remainingPhotos.findIndex(p => p.id === activePhotoId);
                newActiveIndex = foundIndex > -1 ? foundIndex : 0;
            }
        }

        updateAlbumState(draft => {
            draft.photos = remainingPhotos;
        });

        setIsDeleteModalOpen(false);
        setActivePhotoIndex(newActiveIndex);
        setSelectedPhotoIds(new Set());
    };

    const handleResetEdits = () => {
        const idsToUpdate = selectedPhotoIds.size > 0 ? selectedPhotoIds : (activePhoto ? new Set([activePhoto.id]) : new Set());
        if (idsToUpdate.size === 0) return;
        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (idsToUpdate.has(p.id)) {
                    p.manualEdits = { ...initialEdits };
                }
            });
        });
    };

    const handleCopyEdits = () => {
        if (activePhoto?.manualEdits) {
            setCopiedEdits(activePhoto.manualEdits);
            showToast('Adjustments copied.');
        }
    };

    const handlePasteEdits = () => {
        if (!copiedEdits || selectedPhotoIds.size === 0) return;
        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (selectedPhotoIds.has(p.id)) {
                    p.manualEdits = { ...copiedEdits };
                }
            });
        });
        showToast(`Pasted adjustments to ${selectedPhotoIds.size} photos.`);
    };

    const FILTERS: Record<FilterName, Partial<ManualEdits>> = {
        vintage: { sepia: 40, saturate: -20, contrast: 10, exposure: -5 },
        blackAndWhite: { grayscale: 100, contrast: 15 },
        cool: { exposure: 5, shadows: 10, saturate: -10 },
        warm: { sepia: 20, saturate: 10 },
        sepia: { sepia: 100, contrast: -10 }
    };

    const handleApplyFilter = (filterName: FilterName) => {
        const idsToUpdate = selectedPhotoIds.size > 0 ? selectedPhotoIds : (activePhoto ? new Set([activePhoto.id]) : new Set());
        if (idsToUpdate.size === 0) return;

        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (idsToUpdate.has(p.id)) {
                    const currentEdits = (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits))
                        ? p.manualEdits
                        : initialEdits;
                    p.manualEdits = { ...currentEdits, ...FILTERS[filterName] };
                }
            });
        });
    };

    /**
     * Auto-adjust photo enhancements
     * 
     * Applies automatic enhancements to selected photos:
     * - Slight exposure boost for better brightness
     * - Moderate contrast increase for better definition
     * - Slight saturation boost for more vibrant colors
     * 
     * These are conservative adjustments that improve most photos
     * without over-processing. Users can further adjust manually.
     */
    const handleAutoAdjust = () => {
        const idsToUpdate = selectedPhotoIds.size > 0 ? selectedPhotoIds : (activePhoto ? new Set([activePhoto.id]) : new Set());
        if (idsToUpdate.size === 0) return;

        updateAlbumState(draft => {
            draft.photos.forEach((p: Photo) => {
                if (idsToUpdate.has(p.id)) {
                    const currentEdits = (p.manualEdits != null && typeof p.manualEdits === 'object' && !Array.isArray(p.manualEdits))
                        ? p.manualEdits
                        : initialEdits;
                    // Apply conservative auto-enhancements
                    // These values are tuned to improve most photos without over-processing
                    p.manualEdits = { 
                        ...currentEdits, 
                        exposure: Math.min(15, (currentEdits.exposure || 0) + 10), // Boost exposure slightly
                        contrast: Math.min(20, (currentEdits.contrast || 0) + 8), // Increase contrast moderately
                        saturate: Math.min(15, (currentEdits.saturate || 0) + 8), // Boost saturation slightly
                        highlights: Math.min(10, (currentEdits.highlights || 0) + 5), // Recover highlights
                        shadows: Math.min(15, (currentEdits.shadows || 0) + 8) // Lift shadows
                    };
                }
            });
        });
        
        showToast(`Auto-enhanced ${idsToUpdate.size} photo${idsToUpdate.size > 1 ? 's' : ''}`);
    };
    
    // --- Zoom & Pan Handlers ---
    const handleZoom = (direction: 'in' | 'out' | 'reset') => {
        if (isCropping) return;
        if (direction === 'reset') {
            setZoomState({ scale: 1, offsetX: 0, offsetY: 0 });
            return;
        }
        const scaleAmount = 0.2;
        const newScale = direction === 'in'
            ? zoomState.scale + scaleAmount
            : Math.max(1, zoomState.scale - scaleAmount);

        if (newScale <= 1) {
            setZoomState({ scale: 1, offsetX: 0, offsetY: 0 });
        } else {
            setZoomState(prev => ({ ...prev, scale: newScale }));
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLElement>) => {
        if (isCropping) return;
        e.preventDefault();
        const scaleAmount = 0.1;
        const { deltaY } = e;
        
        setZoomState(prev => {
            const newScale = deltaY < 0 
                ? prev.scale * (1 + scaleAmount) 
                : prev.scale / (1 + scaleAmount);

            if (newScale < 1) {
                return { scale: 1, offsetX: 0, offsetY: 0 };
            }
            
            const viewer = viewerRef.current;
            if (!viewer) return prev;

            const rect = viewer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const imageX = (mouseX - prev.offsetX) / prev.scale;
            const imageY = (mouseY - prev.offsetY) / prev.scale;

            const newOffsetX = mouseX - imageX * newScale;
            const newOffsetY = mouseY - imageY * newScale;

            return { scale: newScale, offsetX: newOffsetX, offsetY: newOffsetY };
        });
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isCropping) return;
        if (zoomState.scale > 1) {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = {
                x: e.clientX - zoomState.offsetX,
                y: e.clientY - zoomState.offsetY,
            };
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        if (isCropping) return;
        if (isPanning) {
            const newOffsetX = e.clientX - panStartRef.current.x;
            const newOffsetY = e.clientY - panStartRef.current.y;
            setZoomState(prev => ({ ...prev, offsetX: newOffsetX, offsetY: newOffsetY }));
        }
    };

    const handleMouseUpOrLeave = () => {
        if (isCropping) {
            setDragState(null);
        } else {
            setIsPanning(false);
        }
    };
    // --- End Zoom & Pan Handlers ---
    
    // --- Crop Handlers ---
    const handleToggleCrop = useCallback(() => {
        setIsCropping(prev => {
            const newIsCropping = !prev;
            if (newIsCropping && imageRef.current && viewerRef.current) {
                const imageRect = imageRef.current.getBoundingClientRect();
                const viewerRect = viewerRef.current.getBoundingClientRect();
                
                const initialWidth = imageRect.width * 0.9;
                const initialHeight = imageRect.height * 0.9;

                setCropBox({
                    x: (imageRect.left - viewerRect.left) + (imageRect.width - initialWidth) / 2,
                    y: (imageRect.top - viewerRect.top) + (imageRect.height - initialHeight) / 2,
                    width: initialWidth,
                    height: initialHeight,
                });
            }
            return newIsCropping;
        });
    }, []);

    const handleApplyCrop = useCallback(async () => {
        if (!imageRef.current || !activePhoto || !viewerRef.current || !activePhoto.url) {
            showToast('Cannot crop: Photo data is missing.');
            return;
        }

        const image = imageRef.current;
        if (!image.naturalWidth || !image.naturalHeight) {
            showToast('Cannot crop: Image not loaded yet.');
            return;
        }
        const { naturalWidth, naturalHeight } = image;
        const imageRect = image.getBoundingClientRect();
        const viewerRect = viewerRef.current.getBoundingClientRect();

        const scaleX = naturalWidth / imageRect.width;
        const scaleY = naturalHeight / imageRect.height;
        
        const imageXInViewer = imageRect.left - viewerRect.left;
        const imageYInViewer = imageRect.top - viewerRect.top;

        const sx = (cropBox.x - imageXInViewer) * scaleX;
        const sy = (cropBox.y - imageYInViewer) * scaleY;
        const sWidth = cropBox.width * scaleX;
        const sHeight = cropBox.height * scaleY;
        
        if (sWidth < 1 || sHeight < 1) return;

        setEditingState({ inProgress: true, message: 'Applying crop...' });

        try {
            const canvas = document.createElement('canvas');
            canvas.width = sWidth;
            canvas.height = sHeight;
            const ctx = canvas.getContext('2d');
            
            const imageUrlToCrop = activePhoto.url || '';
            if (!imageUrlToCrop) {
                showToast('Cannot crop: Photo URL is missing.');
                return;
            }

            const imageToCrop = new Image();
            imageToCrop.crossOrigin = "Anonymous";
            imageToCrop.src = imageUrlToCrop;
            
            await new Promise((resolve, reject) => {
                imageToCrop.onload = resolve;
                imageToCrop.onerror = reject;
            });
            
            ctx?.drawImage(imageToCrop, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
            
            const dataUrl = canvas.toDataURL('image/jpeg');

            updateAlbumState(draft => {
                const photoInDraft = draft.photos.find((p: Photo) => p.id === activePhoto.id);
                if (photoInDraft) {
                    photoInDraft.url = dataUrl;
                    photoInDraft.manualEdits = { ...initialEdits }; // Reset edits after destructive crop
                }
            });

            showToast('Crop applied successfully.');
        } catch (error) {
            logger.error('Failed to apply crop', error instanceof Error ? error : undefined, { photoId: activePhoto?.id });
            showToast('Error applying crop.');
        } finally {
            setIsCropping(false);
            setEditingState({ inProgress: false, message: '' });
        }
    }, [activePhoto, cropBox, showToast, updateAlbumState]);

    const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: Handle) => {
        e.stopPropagation();
        e.preventDefault();
        if (!viewerRef.current) return;
        setDragState({
            action: handle === 'move' ? 'move' : 'resize',
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startBox: { ...cropBox }
        });
    };

    useEffect(() => {
        const handleGlobalMove = (e: MouseEvent) => {
             if (!dragState || !viewerRef.current) return;
             const dx = e.clientX - dragState.startX;
             const dy = e.clientY - dragState.startY;
             
             const viewerRect = viewerRef.current.getBoundingClientRect();
             
             if (dragState.action === 'move') {
                 setCropBox(prev => ({
                     ...prev,
                     x: dragState.startBox.x + dx,
                     y: dragState.startBox.y + dy
                 }));
             } else {
                 // Handle resize (Simplified for this snippet)
                 // In real impl, handle different 'handle' types (tl, tr, etc)
                 setCropBox(prev => ({
                     ...prev,
                     width: Math.max(50, dragState.startBox.width + dx),
                     height: Math.max(50, dragState.startBox.height + dy)
                 }));
             }
        };
        const handleGlobalUp = () => {
            if (dragState) setDragState(null);
        };
        
        if (dragState) {
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('mouseup', handleGlobalUp);
        }
        return () => {
             window.removeEventListener('mousemove', handleGlobalMove);
             window.removeEventListener('mouseup', handleGlobalUp);
        }
    }, [dragState]);

    // Update CSS variables for photo editor image
    useEffect(() => {
        if (imageRef.current && activePhoto && activePhoto.url) {
            try {
                const photoStyle = getPhotoStyle(activePhoto);
                const combinedTransform = `translate(${zoomState.offsetX}px, ${zoomState.offsetY}px) scale(${zoomState.scale}) ${photoStyle.transform || ''}`;
                imageRef.current.style.setProperty('--photo-filter', photoStyle.filter || 'none');
                imageRef.current.style.setProperty('--photo-transform', combinedTransform);
            } catch (error) {
                logger.warn('Failed to update photo style', error);
            }
        }
    }, [activePhoto, zoomState, activePhotoIndex]);

    // Update CSS variables for crop overlay
    useEffect(() => {
        if (cropOverlayRef.current && isCropping) {
            cropOverlayRef.current.style.setProperty('--crop-x', `${cropBox.x}px`);
            cropOverlayRef.current.style.setProperty('--crop-y', `${cropBox.y}px`);
            cropOverlayRef.current.style.setProperty('--crop-width', `${cropBox.width}px`);
            cropOverlayRef.current.style.setProperty('--crop-height', `${cropBox.height}px`);
        }
    }, [cropBox, isCropping]);

    if (loading || !album) {
        return <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900"><Spinner /></div>;
    }

    // Safely get photo style
    let photoStyle = { filter: 'none', transform: 'none' };
    try {
        if (activePhoto && activePhoto.url) {
            photoStyle = getPhotoStyle(activePhoto);
        }
    } catch (error) {
        logger.warn('Failed to get photo style', error);
    }
    const combinedTransform = `translate(${zoomState.offsetX}px, ${zoomState.offsetY}px) scale(${zoomState.scale}) ${photoStyle.transform || ''}`;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={handleBackWithCheck} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white" title="Go back" aria-label="Go back">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold truncate max-w-md">{album.title}</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedPhotoIds.size > 0 ? `${selectedPhotoIds.size} selected` : `${activePhotoIndex + 1} / ${album?.photos?.length || 0}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Undo/Redo buttons */}
                    <div className="flex items-center space-x-1 border-r border-slate-300 dark:border-slate-600 pr-3">
                        <button
                            onClick={handleUndo}
                            disabled={historyIndex <= 0 || history.length === 0}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Undo (Ctrl+Z)"
                            aria-label="Undo last edit"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                        <button
                            onClick={handleRedo}
                            disabled={historyIndex >= history.length - 1 || history.length === 0}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Redo (Ctrl+Y)"
                            aria-label="Redo last undone edit"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className={`text-xs font-bold px-2 py-1 rounded uppercase ${saveStatus === 'saved' ? 'text-green-500 bg-green-100 dark:bg-green-900/20' : saveStatus === 'saving' ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/20' : 'text-slate-400'}`}>
                        {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : ''}
                    </div>
                    
                    <button 
                        onClick={() => handleSaveChanges()}
                        disabled={!isDirty || saveStatus === 'saving'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Save
                    </button>

                    <button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm">Done</button>
                </div>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
                 {/* Main Image Area */}
                 <div ref={viewerRef} className="flex-1 relative bg-slate-100 dark:bg-black flex items-center justify-center overflow-hidden cursor-default"
                      onWheel={handleWheel}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUpOrLeave}
                      onMouseLeave={handleMouseUpOrLeave}
                 >
                     {activePhoto && activePhoto.url ? (
                         <>
                            <img 
                                ref={imageRef}
                                src={activePhoto.url || ''} 
                                alt={activePhoto.title || 'Photo'}
                                className="photo-editor-image max-w-full max-h-full object-contain shadow-2xl transition-transform duration-75 select-none"
                                draggable={false}
                                onError={(e) => {
                                    logger.error("Failed to load photo", undefined, { 
                                        photoId: activePhoto?.id || 'unknown', 
                                        url: activePhoto?.url || 'unknown',
                                        albumId: album?.id || 'unknown'
                                    });
                                    showToast(`Error: Could not load photo "${activePhoto?.title || 'Unknown'}". Check backend logs.`);
                                }}
                            />
                         </>
                     ) : (
                         <p className="text-slate-500">No photo selected</p>
                     )}

                     {/* Crop Overlay */}
                     {isCropping && (
                        <div 
                            ref={cropOverlayRef}
                            className="crop-overlay absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                            onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                        >
                            {/* Handles */}
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 cursor-nw-resize" onMouseDown={(e) => handleCropMouseDown(e, 'tl')}></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 cursor-ne-resize" onMouseDown={(e) => handleCropMouseDown(e, 'tr')}></div>
                            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 cursor-sw-resize" onMouseDown={(e) => handleCropMouseDown(e, 'bl')}></div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 cursor-se-resize" onMouseDown={(e) => handleCropMouseDown(e, 'br')}></div>
                        </div>
                     )}

                     {/* Editing Spinner Overlay */}
                     {editingState.inProgress && (
                        <div className="absolute inset-0 z-50 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                            <Spinner />
                            <p className="text-white font-bold mt-4 animate-pulse">{editingState.message}</p>
                        </div>
                     )}
                 </div>
                 
                 {/* Sidebar */}
                 <EditorSidebar 
                    activePhoto={activePhoto}
                    selectedPhotoIds={selectedPhotoIds}
                    onManualEditChange={handleManualEditChange}
                    onQuickRotate={handleQuickRotate}
                    onCategorizeSelected={handleCategorizeSelected}
                    onSendToKiosk={handleSendToKiosk}
                    isEditing={editingState.inProgress}
                    onAIEdit={handleAIEdit}
                    onAutoAdjust={handleAutoAdjust}
                    onApplyFilter={handleApplyFilter}
                    onResetEdits={handleResetEdits}
                    onCopyEdits={handleCopyEdits}
                    onPasteEdits={handlePasteEdits}
                    canPaste={!!copiedEdits}
                    albumDetails={album}
                    onAlbumDetailsChange={setAlbum}
                    onDeleteSelected={() => setIsDeleteModalOpen(true)}
                    isOnline={isOnline}
                    isCropping={isCropping}
                    onToggleCrop={handleToggleCrop}
                    onApplyCrop={handleApplyCrop}
                 />
            </div>
            
            {/* Filmstrip */}
            <Filmstrip 
                photos={album && album.photos && Array.isArray(album.photos) 
                    ? album.photos.filter((p): p is Photo => p != null && typeof p === 'object' && p.id != null && typeof p.id === 'string')
                    : []}
                activePhotoIndex={activePhotoIndex}
                setActivePhotoIndex={setActivePhotoIndex}
                selectedPhotoIds={selectedPhotoIds}
                onToggleSelection={(id) => {
                    setSelectedPhotoIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                    });
                }}
                onSelectAll={() => {
                    const validPhotos = album && album.photos && Array.isArray(album.photos)
                        ? album.photos.filter((p): p is Photo => p != null && typeof p === 'object' && p.id != null && typeof p.id === 'string')
                        : [];
                    setSelectedPhotoIds(new Set(validPhotos.map(p => p.id)));
                }}
                onDeselectAll={() => setSelectedPhotoIds(new Set())}
            />
            
            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={isFinalizeModalOpen}
                onClose={() => setIsFinalizeModalOpen(false)}
                onConfirm={confirmSendToKiosk}
                title="Finalize & Send to Kiosk"
                message={
                    <div>
                        <p>You are about to send <strong>{selectedPhotoIds.size}</strong> photos to the kiosk.</p>
                        <p className="text-sm text-slate-500 mt-2">This will remove them from the editing queue and make them visible to customers. The unselected photos in this draft will be discarded.</p>
                    </div>
                }
                confirmButtonText="Send to Kiosk"
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteSelected}
                title="Delete Photos"
                message={`Are you sure you want to delete ${selectedPhotoIds.size} selected photos? This cannot be undone.`}
                confirmButtonText="Delete"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default AlbumDetail;
