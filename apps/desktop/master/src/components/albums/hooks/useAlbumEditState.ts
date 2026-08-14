import { useState, useCallback, useRef, useEffect } from 'react';
import { Album, Photo } from '../../../types';
import { apiService } from '../../../services/apiService';
import { logger } from '../../../utils/logger';

export type SaveStatus = 'idle' | 'modified' | 'saving' | 'saved' | 'error';

interface UseAlbumEditStateReturn {
    // State
    album: Album | null;
    loading: boolean;
    saveStatus: SaveStatus;
    pristineAlbum: Album | null;
    activePhotoIndex: number;
    selectedPhotoIds: Set<string>;
    copiedEdits: import('../../../types').ManualEdits | null;
    
    // Actions
    loadAlbum: (albumId: string) => Promise<void>;
    updateAlbum: (updates: Partial<Album>) => void;
    updatePhotos: (photos: Photo[]) => void;
    updatePhoto: (photoId: string, updates: Partial<Photo>) => void;
    setActivePhotoIndex: (index: number) => void;
    togglePhotoSelection: (photoId: string) => void;
    selectAllPhotos: () => void;
    deselectAllPhotos: () => void;
    setCopiedEdits: (edits: import('../../../types').ManualEdits | null) => void;
    saveAlbum: () => Promise<void>;
    resetToPristine: () => void;
    markAsModified: () => void;
}

export function useAlbumEditState(
    _albumId: string,  // Reserved for future API integration
    showToast: (msg: string) => void
): UseAlbumEditStateReturn {
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [pristineAlbum, setPristineAlbum] = useState<Album | null>(null);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
    const [copiedEdits, setCopiedEdits] = useState<import('../../../types').ManualEdits | null>(null);
    
    const saveTimeoutRef = useRef<number | null>(null);
    const albumForCleanup = useRef<Album | null>(null);

    useEffect(() => {
        albumForCleanup.current = album;
    }, [album]);

    const loadAlbum = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const fetchedAlbum = await apiService.getAlbum(id);
            if (!fetchedAlbum || typeof fetchedAlbum !== 'object') {
                throw new Error('Album not found');
            }
            
            const albumWithMetadata: Album = {
                ...fetchedAlbum,
                photos: fetchedAlbum.photos || []
            };
            
            setAlbum(albumWithMetadata);
            setPristineAlbum(albumWithMetadata);
            setSaveStatus('idle');
        } catch (error) {
            logger.error('Failed to load album', error instanceof Error ? error : undefined, { albumId: id });
            showToast('Error: Could not load album');
            throw error;
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    const updateAlbum = useCallback((updates: Partial<Album>) => {
        setAlbum(prev => prev ? { ...prev, ...updates } : null);
        setSaveStatus('modified');
    }, []);

    const updatePhotos = useCallback((photos: Photo[]) => {
        setAlbum(prev => prev ? { ...prev, photos } : null);
        setSaveStatus('modified');
    }, []);

    const updatePhoto = useCallback((photoId: string, updates: Partial<Photo>) => {
        setAlbum(prev => {
            if (!prev) return null;
            return {
                ...prev,
                photos: prev.photos?.map(p => p.id === photoId ? { ...p, ...updates } : p) || []
            };
        });
        setSaveStatus('modified');
    }, []);

    const togglePhotoSelection = useCallback((photoId: string) => {
        setSelectedPhotoIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    }, []);

    const selectAllPhotos = useCallback(() => {
        setSelectedPhotoIds(new Set(album?.photos?.map(p => p.id) || []));
    }, [album?.photos]);

    const deselectAllPhotos = useCallback(() => {
        setSelectedPhotoIds(new Set());
    }, []);

    const saveAlbum = useCallback(async () => {
        if (!album || saveStatus === 'saving') return;
        
        setSaveStatus('saving');
        try {
            await apiService.updateAlbum(album.id, album);
            setPristineAlbum(album);
            setSaveStatus('saved');
            showToast('Album saved successfully');
            
            // Reset to idle after 2 seconds
            if (saveTimeoutRef.current) {
                window.clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = window.setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            logger.error('Failed to save album', error instanceof Error ? error : undefined, { albumId: album.id });
            setSaveStatus('error');
            showToast('Error: Failed to save album');
        }
    }, [album, saveStatus, showToast]);

    const resetToPristine = useCallback(() => {
        if (pristineAlbum) {
            setAlbum(pristineAlbum);
            setSaveStatus('idle');
        }
    }, [pristineAlbum]);

    const markAsModified = useCallback(() => {
        setSaveStatus('modified');
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                window.clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        album,
        loading,
        saveStatus,
        pristineAlbum,
        activePhotoIndex,
        selectedPhotoIds,
        copiedEdits,
        loadAlbum,
        updateAlbum,
        updatePhotos,
        updatePhoto,
        setActivePhotoIndex,
        togglePhotoSelection,
        selectAllPhotos,
        deselectAllPhotos,
        setCopiedEdits,
        saveAlbum,
        resetToPristine,
        markAsModified,
    };
}
