
import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Album, Photographer, Photo } from '../../types.ts';
import ImportAlbumModal from './ImportAlbumModal';
import ImportProgressModal from '../common/ImportProgressModal.tsx';

// Lazy load AlbumDetail for code splitting - it's a large component (800+ lines)
const AlbumDetail = lazy(() => import('./AlbumDetail.tsx'));
import { apiService } from '../../services/apiService.ts';
import { logger } from '../../utils/logger.ts';
import { useDebounce } from '../../hooks/useDebounce.ts';
import Spinner from '../common/Spinner.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { useAlbums, useCreateAlbum, useDeleteAlbum } from '../../hooks/useAlbums.ts';
import { usePhotographers } from '../../hooks/usePhotographers.ts';
import ConfirmationModal from '../common/ConfirmationModal.tsx';
import Card from '../common/Card.tsx';
import ErrorBoundary from '../common/ErrorBoundary.tsx';
import { AlbumCardSkeleton } from '../common/Skeleton.tsx';

/**
 * Albums Component Props
 */
interface AlbumsProps {
    /** Function to show toast notifications */
    showToast: (message: string) => void;
    /** Current logged-in user */
    currentUser: Photographer;
    /** Whether the app is online (for AI features) */
    isOnline: boolean;
    /** Refresh trigger - increments to force data refresh */
    refreshTrigger?: number;
}

type AlbumTab = 'queue' | 'live' | 'all';

const StatBadge: React.FC<{ label: string; value: number; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex items-center space-x-3 shadow-sm flex-1 min-w-[120px] transition-all hover:shadow-md">
        <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">{label}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white leading-none mt-0.5">{value}</p>
        </div>
    </div>
);

interface AlbumCardProps {
    album: Album;
    photographerName: string;
    onSelect: () => void;
    onDelete: () => void;
    onToggleSelection: () => void;
    isSelected: boolean;
    isSelectionMode: boolean;
}

const AlbumCard: React.FC<AlbumCardProps> = React.memo(({ album, photographerName, onSelect, onDelete, onToggleSelection, isSelected, isSelectionMode }) => {
    const [imgError, setImgError] = useState(false);
    const isDraft = album.status !== 'Finalized';

    const handleCardClick = (e: React.MouseEvent) => {
        if (isSelectionMode) {
            e.stopPropagation();
            onToggleSelection();
        } else {
            onSelect();
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
    };

    return (
        <div
            onClick={handleCardClick}
            className={`
                relative group rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer border bg-white dark:bg-slate-800 shadow-sm
                ${isSelected
                    ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 transform scale-[0.98] bg-blue-50 dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1'
                }
            `}
        >
            {isSelectionMode && (
                <div className="absolute top-3 left-3 z-30 pointer-events-none">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white/90 border-slate-400'}`}>
                        {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                </div>
            )}
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900">
                {imgError || !album.coverPhotoUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                ) : (
                    <img
                        src={album.coverPhotoUrl}
                        alt={album.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                <div className="absolute top-3 right-3 z-10">
                    {isDraft ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-500 text-white shadow-sm backdrop-blur-md border border-white/20 flex items-center gap-1">Queue</span>
                    ) : (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-green-500 text-white shadow-sm backdrop-blur-md border border-white/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Live
                        </span>
                    )}
                </div>

                {album.roomNumber && (
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-mono font-bold backdrop-blur-md border border-white/10">
                        #{album.roomNumber}
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate pr-2 flex-1 text-base leading-snug" title={album.title}>{album.title}</h3>
                    {!isSelectionMode && (
                        <button
                            onClick={handleDeleteClick}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 -mr-2 -mt-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Delete Album"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="font-medium">{album.photos?.length || 0}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 truncate max-w-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="truncate text-right">{photographerName}</span>
                        </div>
                        {album.date && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                {new Date(album.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.album.id === nextProps.album.id &&
        prevProps.album.status === nextProps.album.status &&
        prevProps.album.coverPhotoUrl === nextProps.album.coverPhotoUrl &&
        prevProps.photographerName === nextProps.photographerName &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isSelectionMode === nextProps.isSelectionMode;
});

/**
 * Albums Component
 * 
 * Main component for managing albums in the Master Portal.
 * 
 * Features:
 * - Tab-based navigation (Queue, Finalized, All)
 * - Album search and filtering
 * - Sorting by date, status, photographer
 * - Bulk selection and operations
 * - Album import with progress tracking
 * - Album creation and deletion
 * - Permission-based access control
 * - Real-time data refresh
 * - Virtualized rendering for performance (AlbumCard with React.memo)
 * 
 * Performance:
 * - Uses React Query for data fetching and caching
 * - Debounced search (300ms)
 * - Memoized filtering and sorting
 * - Optimized AlbumCard component with custom comparison
 * 
 * State Management:
 * - React Query for server state
 * - Local state for UI (tabs, selection, modals)
 * - Permission checks via usePermissions hook
 * 
 * @param {AlbumsProps} props - Component props
 * @param {Function} props.showToast - Toast notification function
 * @param {Photographer} [props.currentUser] - Current logged-in user
 * @param {boolean} props.isOnline - Online/offline status
 * @param {number} props.refreshTrigger - Trigger value to force data refresh
 */
const Albums: React.FC<AlbumsProps> = ({ showToast, currentUser, isOnline, refreshTrigger }) => {
    const [activeTab, setActiveTab] = useState<AlbumTab>('queue');
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [importProgress, setImportProgress] = useState({
        currentFile: '',
        currentIndex: 0,
        totalFiles: 0,
        successCount: 0,
        failCount: 0,
        isComplete: false
    });

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [sortOrder, setSortOrder] = useState('date-desc');

    // Bulk Actions
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());

    // Deletion
    const { can } = usePermissions(currentUser);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [albumToDelete, setAlbumToDelete] = useState<{ id: string; title: string } | null>(null);

    // React Query hooks
    const { data: allAlbums = [], isLoading, refetch } = useAlbums();
    const { data: photographers = [] } = usePhotographers();
    const createAlbumMutation = useCreateAlbum();
    const deleteAlbumMutation = useDeleteAlbum();

    // Refetch when refreshTrigger changes
    useEffect(() => {
        if (refreshTrigger) {
            refetch();
        }
    }, [refreshTrigger, refetch]);

    // Ensure allAlbums and photographers are always arrays
    const safeAlbums = Array.isArray(allAlbums) ? allAlbums : [];
    const safePhotographers = Array.isArray(photographers) ? photographers : [];

    const visibleAlbums = useMemo(() => {
        // Defensive check: ensure we have valid data
        if (!Array.isArray(safeAlbums) || safeAlbums.length === 0) {
            return [];
        }

        // Ensure currentUser exists before filtering
        if (!currentUser || !currentUser.id) {
            return safeAlbums;
        }

        let albums = can('manageAllAlbums') ? safeAlbums : safeAlbums.filter(a => a && String(a.photographerId) === currentUser.id);
        if (activeTab === 'queue') {
            albums = albums.filter(a => a && a.status !== 'Finalized' && a.status !== 'Archived');
        } else if (activeTab === 'live') {
            albums = albums.filter(a => a && a.status === 'Finalized');
        }
        return albums;
    }, [safeAlbums, currentUser, can, activeTab]);

    const filteredAndSortedAlbums = useMemo(() => {
        // Defensive check: ensure visibleAlbums is an array
        if (!Array.isArray(visibleAlbums)) {
            return [];
        }

        return visibleAlbums
            .filter(album => {
                // Ensure album is valid
                if (!album || typeof album !== 'object') {
                    return false;
                }

                if (!debouncedSearchTerm) return true;
                const searchLower = debouncedSearchTerm.toLowerCase();
                return (
                    (album.title && album.title.toLowerCase().includes(searchLower)) ||
                    (album.roomNumber && album.roomNumber.toLowerCase().includes(searchLower)) ||
                    (safePhotographers.find(p => p && p.id === String(album.photographerId))?.name || '').toLowerCase().includes(searchLower)
                );
            })
            .sort((a, b) => {
                // Defensive checks for sort
                if (!a || !b) return 0;

                switch (sortOrder) {
                    case 'date-asc':
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateA - dateB;
                    case 'title-asc':
                        return (a.title || '').localeCompare(b.title || '');
                    case 'date-desc':
                    default:
                        const dateADesc = a.date ? new Date(a.date).getTime() : 0;
                        const dateBDesc = b.date ? new Date(b.date).getTime() : 0;
                        return dateBDesc - dateADesc;
                }
            });
    }, [visibleAlbums, debouncedSearchTerm, sortOrder, safePhotographers]);

    // KPI Stats
    const kpiStats = useMemo(() => {
        // Defensive check: ensure safeAlbums is an array
        if (!Array.isArray(safeAlbums)) {
            return { queue: 0, live: 0, today: 0 };
        }

        // Ensure currentUser exists before filtering
        const userAlbums = (can('manageAllAlbums') || !currentUser || !currentUser.id)
            ? safeAlbums
            : safeAlbums.filter(a => a && String(a.photographerId) === currentUser.id);

        return {
            queue: userAlbums.filter(a => a && a.status !== 'Finalized' && a.status !== 'Archived').length,
            live: userAlbums.filter(a => a && a.status === 'Finalized').length,
            today: userAlbums.filter(a => a && a.date === new Date().toISOString().split('T')[0]).length
        };
    }, [safeAlbums, currentUser, can]);

    const handleAlbumFinalized = () => {
        setSelectedAlbum(null);
        refetch();
        setActiveTab('live');
    };

    const handleImportComplete = useCallback(async (albumData: Omit<Album, 'id' | 'photos' | 'coverPhotoUrl'>, photoFiles: File[]) => {
        try {
            // Initialize progress modal
            setIsProgressModalOpen(true);
            setImportProgress({
                currentFile: '',
                currentIndex: 0,
                totalFiles: photoFiles.length,
                successCount: 0,
                failCount: 0,
                isComplete: false
            });

            // Log to console for Windows terminal visibility
            console.log(`\n=== Starting Photo Import ===`);
            console.log(`Album: ${albumData.title}`);
            console.log(`Total Photos: ${photoFiles.length}`);
            console.log(`\nCopying files...\n`);

            // Create album first using mutation
            const createdAlbum = await createAlbumMutation.mutateAsync(albumData);

            // Upload photos with parallel batch processing and retry logic
            const BATCH_SIZE = 5; // Upload 5 photos at a time
            const MAX_RETRIES = 3; // Retry failed uploads up to 3 times
            const UPLOAD_TIMEOUT = 120000; // 2 minutes timeout per photo

            let successCount = 0;
            let failCount = 0;
            const failedPhotos: Array<{ file: File; error: string }> = [];

            // Helper function to upload a single photo with retry logic
            const uploadPhotoWithRetry = async (file: File, fileIndex: number, retryCount = 0): Promise<boolean> => {
                // Update progress for current file
                setImportProgress(prev => ({
                    ...prev,
                    currentFile: file.name,
                    currentIndex: fileIndex + 1
                }));

                // Log to console
                console.log(`[${fileIndex + 1}/${photoFiles.length}] Copying: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

                try {
                    const formData = new FormData();
                    formData.append('title', file.name);
                    formData.append('albumId', createdAlbum.id);
                    formData.append('photographerId', String(albumData.photographerId));
                    formData.append('url', file);

                    // Create a timeout promise
                    const uploadPromise = apiService.createPhoto(formData);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error(`Upload timeout after ${UPLOAD_TIMEOUT}ms`)), UPLOAD_TIMEOUT)
                    );

                    await Promise.race([uploadPromise, timeoutPromise]);
                    console.log(`  ✓ Success: ${file.name}`);
                    return true;
                } catch (photoError: any) {
                    const errorMessage = photoError instanceof Error
                        ? photoError.message
                        : (typeof photoError === 'string' ? photoError : 'Unknown error');

                    // Log detailed error information
                    logger.error(`Failed to upload photo ${file.name} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`, {
                        error: errorMessage,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        retryCount,
                        stack: photoError instanceof Error ? photoError.stack : undefined,
                        status: photoError?.status,
                        response: photoError?.response
                    });

                    // Retry if we haven't exceeded max retries
                    if (retryCount < MAX_RETRIES) {
                        console.log(`  ⚠ Retrying (${retryCount + 1}/${MAX_RETRIES}): ${file.name}`);
                        // Exponential backoff: wait 1s, 2s, 4s
                        const delay = Math.pow(2, retryCount) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return uploadPhotoWithRetry(file, fileIndex, retryCount + 1);
                    }

                    // Max retries exceeded, record failure
                    console.log(`  ✗ Failed: ${file.name} - ${errorMessage}`);
                    failedPhotos.push({ file, error: errorMessage });
                    return false;
                }
            };

            // Process photos in batches
            for (let i = 0; i < photoFiles.length; i += BATCH_SIZE) {
                const batch = photoFiles.slice(i, i + BATCH_SIZE);
                const batchPromises = batch.map((file, batchIndex) =>
                    uploadPhotoWithRetry(file, i + batchIndex)
                );
                const batchResults = await Promise.allSettled(batchPromises);

                batchResults.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        successCount++;
                        setImportProgress(prev => ({ ...prev, successCount }));
                    } else {
                        failCount++;
                        setImportProgress(prev => ({ ...prev, failCount }));
                    }
                });

                // Log progress for large imports
                if (photoFiles.length > 10) {
                    const progress = Math.round(((i + batch.length) / photoFiles.length) * 100);
                    logger.info(`Photo upload progress: ${i + batch.length}/${photoFiles.length} (${progress}%)`);
                    console.log(`\nProgress: ${i + batch.length}/${photoFiles.length} (${progress}%) - Success: ${successCount}, Failed: ${failCount}\n`);
                }
            }

            // Mark import as complete
            setImportProgress(prev => ({ ...prev, isComplete: true }));
            console.log(`\n=== Import Complete ===`);
            console.log(`Success: ${successCount} photos`);
            console.log(`Failed: ${failCount} photos`);
            console.log(`\n`);

            if (successCount > 0) {
                // Refetch albums to get updated data with photos
                await refetch();
                setImportModalOpen(false);
                if (failCount > 0) {
                    // Log failed photos for debugging
                    logger.warn(`Album import completed with ${failCount} failures`, {
                        albumId: createdAlbum.id,
                        albumTitle: createdAlbum.title,
                        failedPhotos: failedPhotos.map(f => ({
                            name: f.file.name,
                            size: f.file.size,
                            error: f.error
                        }))
                    });
                    showToast(`Album "${createdAlbum.title}" imported with ${successCount} photos. ${failCount} photos failed to upload. Check logs for details.`);
                } else {
                    showToast(`Album "${createdAlbum.title}" imported successfully with ${successCount} photos.`);
                }
                setActiveTab('queue');
            } else {
                // All photos failed, delete the album
                logger.error(`All ${photoFiles.length} photos failed to upload for album "${createdAlbum.title}"`, {
                    albumId: createdAlbum.id,
                    failedPhotos: failedPhotos.map(f => ({
                        name: f.file.name,
                        error: f.error
                    }))
                });
                try {
                    await deleteAlbumMutation.mutateAsync(createdAlbum.id);
                } catch (deleteError) {
                    logger.error("Failed to clean up album after photo import failure", deleteError instanceof Error ? deleteError : undefined);
                }
                showToast(`Error: Failed to import any photos. Album creation was rolled back. Check logs for details.`);
            }
        } catch (error) {
            logger.error("Import failed", error instanceof Error ? error : undefined, { albumTitle: albumData.title });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setImportProgress(prev => ({ ...prev, isComplete: true }));
            showToast(`Error: Could not import album. ${errorMessage}`);
            console.error(`\n✗ Import Failed: ${errorMessage}\n`);
        }
    }, [showToast, createAlbumMutation, deleteAlbumMutation, refetch]);

    /**
     * Handle album save from AlbumDetail component
     * 
     * Updates the album in the local state and triggers a refresh.
     * This ensures the album list stays in sync with edits made in AlbumDetail.
     * 
     * @param {Album} updatedAlbum - The updated album object from AlbumDetail
     */
    const handleAlbumSave = (updatedAlbum: Album) => {
        // React Query will automatically refetch and update the cache
        // Just update the selected album for immediate UI feedback
        setSelectedAlbum(updatedAlbum);
    };

    const handleDeleteRequest = (albumId: string, albumTitle: string) => {
        if (!can('manageAllAlbums') && !can('manageOwnAlbums')) return;
        setAlbumToDelete({ id: albumId, title: albumTitle });
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteAlbum = async () => {
        if (albumToDelete) {
            try {
                await deleteAlbumMutation.mutateAsync(albumToDelete.id);
                showToast(`Album deleted.`);
            } catch (error) {
                showToast(`Error: Could not delete album.`);
            } finally {
                setIsDeleteModalOpen(false);
                setAlbumToDelete(null);
            }
        } else if (selectedAlbumIds.size > 0) {
            try {
                await Promise.all(Array.from(selectedAlbumIds).map((id: string) => deleteAlbumMutation.mutateAsync(id)));
                showToast(`${selectedAlbumIds.size} albums deleted.`);
                setSelectedAlbumIds(new Set());
                setIsSelectionMode(false);
            } catch (error) {
                showToast(`Error: Could not delete all selected albums.`);
            } finally {
                setIsDeleteModalOpen(false);
            }
        }
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setSelectedAlbumIds(new Set());
        }
        setIsSelectionMode(!isSelectionMode);
    };

    const toggleAlbumSelection = (id: string) => {
        setSelectedAlbumIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleBulkDeleteRequest = () => {
        if (selectedAlbumIds.size === 0) return;
        setAlbumToDelete(null);
        setIsDeleteModalOpen(true);
    };

    if (selectedAlbum) {
        return (
            <ErrorBoundary>
                <Suspense fallback={
                    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                        <Spinner />
                    </div>
                }>
                    <AlbumDetail
                        albumId={selectedAlbum.id}
                        onBack={() => setSelectedAlbum(null)}
                        onFinalizeSuccess={handleAlbumFinalized}
                        onSave={handleAlbumSave}
                        showToast={showToast}
                        isOnline={isOnline}
                    />
                </Suspense>
            </ErrorBoundary>
        );
    }

    return (
        <div className="animate-fadeIn pb-20">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex-1 w-full">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Album Workflow</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage photoshoot sessions, import new media, and publish to kiosks.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 max-w-3xl">
                        <StatBadge
                            label="Queue"
                            value={kpiStats.queue}
                            color="bg-amber-500 text-amber-600 dark:text-amber-400"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatBadge
                            label="Live"
                            value={kpiStats.live}
                            color="bg-green-500 text-green-600 dark:text-green-400"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatBadge
                            label="Today"
                            value={kpiStats.today}
                            color="bg-blue-500 text-blue-600 dark:text-blue-400"
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        />
                    </div>
                </div>

                {/* Global Actions */}
                {(can('manageOwnAlbums') || can('manageAllAlbums')) && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto flex-shrink-0 mt-2 xl:mt-0">
                        <button
                            onClick={() => setImportModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 w-full sm:w-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Import New</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Sticky Filter Bar */}
            <div className="sticky top-4 z-20 shadow-xl shadow-slate-200/50 dark:shadow-black/20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 p-2">
                    {/* Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl w-full lg:w-auto overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`flex-1 lg:flex-none px-4 md:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'queue' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <span>Queue</span>
                            {kpiStats.queue > 0 && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded-full text-[10px]">{kpiStats.queue}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`flex-1 lg:flex-none px-4 md:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'live' ? 'bg-white dark:bg-slate-800 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            <span>Live</span>
                            {kpiStats.live > 0 && <span className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-1.5 py-0.5 rounded-full text-[10px]">{kpiStats.live}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 lg:flex-none px-4 md:px-6 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            All
                        </button>
                    </div>

                    {/* Search, Sort & Selection */}
                    <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                        <div className="relative flex-grow lg:flex-grow-0 group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search albums..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full lg:w-64 pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>
                        <div className="relative">
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-8 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="title-asc">Title A-Z</option>
                            </select>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden lg:block"></div>
                        <button
                            onClick={toggleSelectionMode}
                            className={`p-2.5 rounded-xl transition-all border ${isSelectionMode ? 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title={isSelectionMode ? "Exit Selection Mode" : "Select Multiple Albums"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        {isSelectionMode && (
                            <button
                                onClick={handleBulkDeleteRequest}
                                disabled={selectedAlbumIds.size === 0}
                                className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                <span className="hidden sm:inline">Delete</span> ({selectedAlbumIds.size})
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                    {[...Array(10)].map((_, i) => (
                        <AlbumCardSkeleton key={i} />
                    ))}
                </div>
            ) : filteredAndSortedAlbums.length > 0 ? (
                <>
                    {debouncedSearchTerm && (
                        <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                            Found <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredAndSortedAlbums.length}</span> {filteredAndSortedAlbums.length === 1 ? 'album' : 'albums'} matching "{debouncedSearchTerm}"
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        {filteredAndSortedAlbums.map(album => {
                            // Defensive check: ensure album is valid
                            if (!album || !album.id) {
                                return null;
                            }
                            const photographer = safePhotographers.find(p => p && p.id === String(album.photographerId));
                            return (
                                <AlbumCard
                                    key={album.id}
                                    album={album}
                                    photographerName={photographer?.name || 'Unknown'}
                                    onSelect={() => setSelectedAlbum(album)}
                                    onDelete={() => handleDeleteRequest(album.id, album.title)}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedAlbumIds.has(album.id)}
                                    onToggleSelection={() => toggleAlbumSelection(album.id)}
                                />
                            )
                        })}
                    </div>
                </>
            ) : (
                <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="bg-white dark:bg-slate-800 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {activeTab === 'queue' ? "Processing Queue Empty" :
                            activeTab === 'live' ? "No Live Albums" :
                                debouncedSearchTerm ? "No Albums Found" : "No Albums Yet"}
                    </h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {activeTab === 'queue' ? "Great job! You've cleared your workspace. Import new photos to get started." :
                            activeTab === 'live' ? "Finalize albums from the queue to display them here and on the Kiosks." :
                                debouncedSearchTerm ? "Try adjusting your search criteria or clear the search to see all albums." :
                                    "Get started by importing your first album using the 'Import New' button above."}
                    </p>
                    {activeTab === 'queue' && (can('manageOwnAlbums') || can('manageAllAlbums')) && (
                        <button
                            onClick={() => setImportModalOpen(true)}
                            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Import Album
                        </button>
                    )}
                </div>
            )}

            <ImportAlbumModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImportComplete}
                isOnline={isOnline}
                photographers={safePhotographers}
            />
            <ImportProgressModal
                isOpen={isProgressModalOpen}
                currentFile={importProgress.currentFile}
                currentIndex={importProgress.currentIndex}
                totalFiles={importProgress.totalFiles}
                successCount={importProgress.successCount}
                failCount={importProgress.failCount}
                isComplete={importProgress.isComplete}
                onClose={() => setIsProgressModalOpen(false)}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteAlbum}
                title={albumToDelete ? "Delete Album" : "Bulk Delete Albums"}
                message={
                    albumToDelete
                        ? <>Are you sure you want to delete <strong>"{albumToDelete.title}"</strong>? This cannot be undone.</>
                        : <>Are you sure you want to delete <strong>{selectedAlbumIds.size}</strong> albums? This cannot be undone.</>
                }
                confirmButtonText="Delete Permanently"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default Albums;
