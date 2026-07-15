import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  Suspense,
  lazy,
  useTransition,
} from "react";
import { VirtuosoGrid } from "react-virtuoso";
import styled from "@emotion/styled";
import { Album, Photographer, Photo, AlbumTab, AlbumStatus } from "../../types.ts";
import ImportAlbumModal from "./ImportAlbumModal";
import ImportProgressModal from "../common/ImportProgressModal.tsx";
import PageHeader from "../common/PageHeader";

// Lazy load AlbumEditor for code splitting
// Using the new modular AlbumEditor (editor2) for improved zoom, retouch and analytics 1492
const AlbumEditor = lazy(() => import("./editor2/AlbumEditor.tsx"));
import { apiService } from "../../services/apiService.ts";
import { logger } from "../../utils/logger.ts";
import { createProxyImage } from "../../utils/imageUtils.ts";
import { useDebounce } from "../../hooks/useDebounce.ts";
import Spinner from "../common/Spinner.tsx";
import { usePermissions } from "../../hooks/usePermissions.ts";
import {
  useAlbums,
  useCreateAlbum,
  useDeleteAlbum,
} from "../../hooks/useAlbums.ts";
import { usePhotographers } from "../../hooks/usePhotographers.ts";
import ConfirmationModal from "../common/ConfirmationModal.tsx";
import { imageProcessingService } from "../../services/imageProcessingService.ts";
import ErrorBoundary from "../common/ErrorBoundary.tsx";
import { AlbumCardSkeleton } from "../common/Skeleton.tsx";

import EmptyState from "./components/EmptyState";
import FilterPanel from "./components/FilterPanel";
import BulkSelectionToolbar from "./components/BulkSelectionToolbar";
import AlbumCard from "./components/AlbumCard";

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




// Styled components for VirtuosoGrid
const ItemContainer = styled.div`
  padding: 0.5rem;
  width: 25%;
  @media (max-width: 1536px) {
    width: 25%;
  }
  @media (max-width: 1280px) {
    width: 33.333%;
  }
  @media (max-width: 1024px) {
    width: 50%;
  }
  @media (max-width: 640px) {
    width: 100%;
  }
  display: flex;
  flex: none;
  align-content: stretch;
  box-sizing: border-box;
`;

const ListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const StatBadge: React.FC<{
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <div className="glass-card p-2 sm:p-3 flex items-center space-x-2 sm:space-x-2.5 shadow-sm flex-1 min-w-[100px] sm:min-w-[120px] transition-all hover:shadow-lg hover:-translate-y-0.5 group">
    <div
      className={`p-1.5 sm:p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100 flex-shrink-0 group-hover:scale-110 transition-transform`}
    >
      {React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<any>, {
            className: "h-4 w-4 sm:h-5 sm:w-5",
          })
        : icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-tight">
        {label}
      </p>
      <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-none mt-0.5">
        {value}
      </p>
    </div>
  </div>
);

/**
 * Empty State Component
 * Displays contextual empty state based on current filters and active tab
 */


/**
 * Loading Skeleton Grid
 * Displays loading skeletons while data is being fetched
 */
const LoadingSkeletonGrid: React.FC = React.memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
    {[...Array(10)].map((_, i) => (
      <AlbumCardSkeleton key={i} />
    ))}
  </div>
));

LoadingSkeletonGrid.displayName = "LoadingSkeletonGrid";

/**
 * Filter Panel Component
 * Advanced filtering options for albums
 */


/**
 * Bulk Selection Toolbar
 * Shows actions for bulk selected albums
 */




/**
 * Custom hook for bulk selection logic
 */
const useBulkSelection = (albumIds: string[]) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedAlbumIds(new Set());
      }
      return !prev;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedAlbumIds(new Set());
  }, []);

  const toggleAlbumSelection = useCallback((id: string) => {
    setSelectedAlbumIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedAlbumIds(new Set(albumIds));
    logger.debug("Selected all albums", { count: albumIds.length });
  }, [albumIds]);

  const deselectAll = useCallback(() => {
    setSelectedAlbumIds(new Set());
    logger.debug("Deselected all albums");
  }, []);

  const selectedCount = selectedAlbumIds.size;

  return {
    isSelectionMode,
    selectedAlbumIds,
    selectedCount,
    toggleSelectionMode,
    exitSelectionMode,
    toggleAlbumSelection,
    selectAll,
    deselectAll,
  };
};

/**
 * Custom hook for album filtering with React 19 useTransition
 */
const useAlbumFilters = (canManageAll: boolean, currentUserId?: string) => {
  const [isPending, startTransition] = useTransition();
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedPhotographer, setSelectedPhotographer] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<AlbumStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const hasFilters = useMemo(() => {
    return (
      dateRange.start !== "" ||
      dateRange.end !== "" ||
      selectedPhotographer !== "" ||
      selectedStatus !== "all" ||
      searchTerm !== ""
    );
  }, [dateRange, selectedPhotographer, selectedStatus, searchTerm]);

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setDateRange({ start: "", end: "" });
      setSelectedPhotographer("");
      setSelectedStatus("all");
      setSearchTerm("");
    });
    logger.info("Cleared all filters");
  }, []);

  const buildFilterString = useCallback(
    (activeTab: AlbumTab) => {
      const filters: string[] = [];

      // Permission-based filter
      if (!canManageAll && currentUserId) {
        filters.push(`photographerId="${currentUserId}"`);
      }

      // Tab filter - simplified for better PocketBase compatibility
      if (activeTab === "queue") {
        // Queue = NOT finalized (includes null, empty, 'Draft', etc.)
        filters.push("status!='Finalized'");
      } else if (activeTab === "live") {
        // Live = Finalized
        filters.push("status='Finalized'");
      }

      // Search filter
      if (debouncedSearchTerm) {
        filters.push(
          `(title~"${debouncedSearchTerm}"||roomNumber~"${debouncedSearchTerm}")`,
        );
      }

      // Date range filter
      if (dateRange.start) {
        filters.push(`date>="${dateRange.start}"`);
      }
      if (dateRange.end) {
        filters.push(`date<="${dateRange.end}"`);
      }

      // Photographer filter
      if (selectedPhotographer) {
        filters.push(`photographerId="${selectedPhotographer}"`);
      }

      // Status filter (only apply if not using tab filters)
      if (selectedStatus !== "all" && activeTab === "all") {
        filters.push(`status="${selectedStatus}"`);
      }

      return filters.length > 0 ? filters.join("&&") : "";
    },
    [
      canManageAll,
      currentUserId,
      debouncedSearchTerm,
      dateRange,
      selectedPhotographer,
      selectedStatus,
    ],
  );

  return {
    isPending,
    dateRange,
    setDateRange: (value: { start: string; end: string }) => startTransition(() => setDateRange(value)),
    selectedPhotographer,
    setSelectedPhotographer: (value: string) => startTransition(() => setSelectedPhotographer(value)),
    selectedStatus,
    setSelectedStatus: (value: AlbumStatus) => startTransition(() => setSelectedStatus(value)),
    searchTerm,
    setSearchTerm: (value: string) => startTransition(() => setSearchTerm(value)),
    debouncedSearchTerm,
    hasFilters,
    clearFilters,
    buildFilterString,
  };
};

/**
 * Custom hook for album export
 */
const useAlbumExport = (albums: Album[], photographers: Photographer[]) => {
  const exportAlbums = useCallback(
    (albumIds: Set<string>) => {
      const selectedAlbums = albums.filter((a) => albumIds.has(a.id));

      if (selectedAlbums.length === 0) {
        logger.warn("Export attempted with no selected albums");
        return;
      }

      const exportData = selectedAlbums.map((album) => ({
        id: album.id,
        title: album.title,
        status: album.status,
        photographer:
          photographers.find((p) => p.id === album.photographerId)?.name ||
          "Unknown",
        date: album.date ? new Date(album.date).toLocaleDateString() : "N/A",
        photoCount: album.photos?.length || album.numberOfPhotos || 0,
        roomNumber: album.roomNumber || "N/A",
        created: album.created
          ? new Date(album.created).toLocaleString()
          : "N/A",
      }));

      const csvHeaders = [
        "ID",
        "Title",
        "Status",
        "Photographer",
        "Date",
        "Photo Count",
        "Room Number",
        "Created",
      ];
      const csvRows = exportData.map((row) => [
        row.id,
        `"${row.title.replace(/"/g, '""')}"`,
        row.status,
        row.photographer,
        row.date,
        row.photoCount,
        row.roomNumber,
        row.created,
      ]);

      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((r) => r.join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `albums_export_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info("Exported albums to CSV", {
        count: selectedAlbums.length,
        filename: `albums_export_${new Date().toISOString().split("T")[0]}.csv`,
      });
    },
    [albums, photographers],
  );

  return { exportAlbums };
};

/**
 * Albums Component
 *
 * Main component for managing albums in the Master Portal.
 *
 * Features:
 * - Tab-based navigation (Queue, Finalized, All)
 * - Album search and filtering with date range, photographer, status
 * - Sorting by date, status, photographer
 * - Bulk selection and operations with checkbox UI
 * - Album export functionality (CSV)
 * - Album import with progress tracking
 * - Album creation and deletion
 * - Permission-based access control
 * - Real-time data refresh
 * - Virtualized rendering for performance (AlbumCard with React.memo)
 * - Loading skeletons and improved empty states
 * - Comprehensive logging
 *
 * Performance:
 * - Uses React Query for data fetching and caching
 * - Debounced search (300ms)
 * - Memoized filtering and sorting
 * - Optimized AlbumCard component with custom comparison
 * - Extracted hooks for complex logic
 *
 * State Management:
 * - React Query for server state
 * - Local state for UI (tabs, selection, modals, filters)
 * - Permission checks via usePermissions hook
 * - Custom hooks: useBulkSelection, useAlbumFilters, useAlbumExport
 *
 * @param {AlbumsProps} props - Component props
 * @param {Function} props.showToast - Toast notification function
 * @param {Photographer} [props.currentUser] - Current logged-in user
 * @param {boolean} props.isOnline - Online/offline status
 * @param {number} props.refreshTrigger - Trigger value to force data refresh
 */
const Albums: React.FC<AlbumsProps> = ({
  showToast,
  currentUser,
  refreshTrigger,
}) => {
  logger.debug("Albums component rendering");

  const [activeTab, setActiveTab] = useState<AlbumTab>("queue");
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("date-desc");
  const [importProgress, setImportProgress] = useState({
    currentFile: "",
    currentIndex: 0,
    totalFiles: 0,
    successCount: 0,
    failCount: 0,
    isComplete: false,
    statusText: "",
  });

  const { can } = usePermissions(currentUser);
  const canManageAll = can("manageAllAlbums");
  const canManageOwn = can("manageOwnAlbums");

  // Filter hook
  const {
    isPending: _isFiltering,
    dateRange,
    setDateRange,
    selectedPhotographer,
    setSelectedPhotographer,
    selectedStatus,
    setSelectedStatus,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    hasFilters,
    clearFilters,
  } = useAlbumFilters(canManageAll, currentUser?.id);

  // React Query hooks
  // React Query hooks - Reverted to useAlbums (Fetch All) for reliable client-side filtering
  // This matches legacy behavior and fixes the "Queue" vs "Live" count discrepancies
  const { data: allAlbums = [], isLoading, refetch } = useAlbums();

  const { data: photographers = [] } = usePhotographers();
  const createAlbumMutation = useCreateAlbum();
  const deleteAlbumMutation = useDeleteAlbum();

  const safePhotographers = Array.isArray(photographers) ? photographers : [];
  const albumIds = useMemo(() => allAlbums.map((a) => a.id), [allAlbums]);

  // Bulk selection hook
  const {
    isSelectionMode,
    selectedAlbumIds,
    selectedCount,
    toggleSelectionMode,
    exitSelectionMode,
    toggleAlbumSelection,
    selectAll,
    deselectAll,
  } = useBulkSelection(albumIds);

  // Export hook
  const { exportAlbums } = useAlbumExport(allAlbums, safePhotographers);

  // Deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Refetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      logger.info("Refreshing albums due to refreshTrigger", {
        refreshTrigger,
      });
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // Log tab changes
  useEffect(() => {
    logger.debug("Active tab changed", { tab: activeTab });
  }, [activeTab]);

  // KPI Stats calculated from loaded albums
  const kpiStats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      queue: allAlbums.filter((a) => a.status !== "Finalized").length,
      live: allAlbums.filter((a) => a.status === "Finalized").length,
      today: allAlbums.filter(
        (a) => a.date && new Date(a.date).toDateString() === today,
      ).length,
    };
  }, [allAlbums]);

  const handleImportComplete = useCallback(
    async (
      albumData: Omit<Album, "id" | "photos" | "coverPhotoUrl"> & { autoProcess?: boolean },
      photoFiles: File[],
    ) => {
      try {
        setIsProgressModalOpen(true);
        setImportProgress({
          currentFile: "",
          currentIndex: 0,
          totalFiles: photoFiles.length,
          successCount: 0,
          failCount: 0,
          isComplete: false,
          statusText: "",
        });

        logger.info("Starting photo import", {
          albumTitle: albumData.title,
          totalPhotos: photoFiles.length,
          photographerId: albumData.photographerId,
        });

        const createdAlbum = await createAlbumMutation.mutateAsync(albumData);
        logger.info("[Import] Album created successfully:", createdAlbum);

        if (!createdAlbum || !createdAlbum.id) {
          logger.error("[Import] Failed to create album: No data returned", {
            createdAlbum,
            albumData: {
              title: albumData.title,
              date: albumData.date,
              photographerId: albumData.photographerId,
              roomNumber: albumData.roomNumber,
            },
          });
          throw new Error(
            "Failed to create album: No data returned. Please check console for details.",
          );
        }

        const albumId = createdAlbum.id;
        logger.info(`[Import] Starting photo uploads for Album ID: ${albumId}`);

        const BATCH_SIZE = 5;
        const MAX_RETRIES = 3;
        const UPLOAD_TIMEOUT = 120000;

        let successCount = 0;
        let failCount = 0;
        const failedPhotos: Array<{ file: File; error: string }> = [];

        const uploadPhotoWithRetry = async (
          file: File,
          fileIndex: number,
          retryCount = 0,
        ): Promise<{ success: boolean; url?: string }> => {
          setImportProgress((prev) => ({
            ...prev,
            currentFile: file.name,
            currentIndex: fileIndex + 1,
            statusText: albumData.autoProcess ? "Auto-processing..." : "Preparing...",
          }));

          logger.debug(
            `Uploading photo ${fileIndex + 1}/${photoFiles.length}`,
            {
              fileName: file.name,
              fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            },
          );

          try {
            let finalFile = file;

            if (albumData.autoProcess) {
              try {
                const objectUrl = URL.createObjectURL(file);
                const img = await imageProcessingService.loadImageFromUrl(objectUrl);
                URL.revokeObjectURL(objectUrl);

                const imageData = imageProcessingService.getImageData(img);
                const result = await imageProcessingService.autoEditFullAsync(imageData);

                const canvas = document.createElement('canvas');
                canvas.width = result.imageData.width;
                canvas.height = result.imageData.height;
                const ctx = canvas.getContext('2d')!;
                ctx.putImageData(result.imageData, 0, 0);

                const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, file.type || 'image/jpeg', 0.9));
                if (blob) {
                  finalFile = new File([blob], file.name, { type: file.type || 'image/jpeg' });
                  logger.debug(`Auto-processed ${file.name} successfully`);
                }
              } catch (err) {
                logger.warn(`Auto-process failed for ${file.name}, falling back to original`, err);
              }
            }

            setImportProgress((prev) => ({
              ...prev,
              statusText: "Uploading...",
            }));

            const formData = new FormData();
            formData.append("title", finalFile.name);
            formData.append("albumId", createdAlbum.id);
            formData.append("photographerId", String(albumData.photographerId));
            formData.append("url", finalFile);

            // 2-Tier System: Generate and upload proxy
            try {
              const proxyBlob = await createProxyImage(finalFile);
              formData.append("preview", proxyBlob, "proxy.jpg");
              logger.debug(
                `Generated proxy for ${finalFile.name} (${(proxyBlob.size / 1024).toFixed(2)} KB)`,
              );
            } catch (proxyError) {
              logger.warn(
                `Failed to generate proxy for ${finalFile.name}, falling back to original only`,
                proxyError,
              );
            }

            const uploadPromise = apiService.createPhoto(formData);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error(`Upload timeout after ${UPLOAD_TIMEOUT}ms`)),
                UPLOAD_TIMEOUT,
              ),
            );

            const photo = (await Promise.race([
              uploadPromise,
              timeoutPromise,
            ])) as Photo;
            logger.debug(`Photo uploaded successfully: ${finalFile.name}`);

            const photoUrl = `/api/files/photos/${photo.id}/${photo.url}`;
            
            // Queue auto-edit if enabled
            // Note: Since we already auto-processed before upload, we no longer need the background job
            // unless we want to do more things backend side, but for now we applied them locally.

            return { success: true, url: photoUrl };
          } catch (photoError: any) {
            const errorMessage =
              photoError instanceof Error
                ? photoError.message
                : typeof photoError === "string"
                  ? photoError
                  : "Unknown error";

            // Duplicate photo — already exists in the DB, counts as success, never retry.
            if (
              photoError?.status === 409 ||
              errorMessage.includes("Duplicate photo") ||
              errorMessage.includes("DUPLICATE_PHOTO")
            ) {
              logger.info(`Skipping duplicate photo: ${file.name}`);
              return { success: true };
            }

            logger.error(
              `Failed to upload photo ${file.name} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`,
              {
                error: errorMessage,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                retryCount,
              },
            );

            // Retryable server errors: album FK not yet visible (422), queue full (503),
            // or transient network / timeout failures.
            const isRetryableServerError =
              errorMessage.includes("ALBUM_NOT_FOUND") ||
              errorMessage.includes("QUEUE_FULL") ||
              errorMessage.includes("please retry") ||
              errorMessage.includes("503") ||
              errorMessage.includes("422");

            // Permanent client errors (bad input, auth) — never retry.
            const isClientError =
              !isRetryableServerError &&
              (errorMessage.includes("400") ||
                errorMessage.includes("Invalid Input") ||
                errorMessage.includes("Validation failed") ||
                errorMessage.includes("403") ||
                errorMessage.includes("404"));

            if ((isRetryableServerError || !isClientError) && retryCount < MAX_RETRIES) {
              // Back off longer for queue-full (server asked for 10s).
              const queueFull = errorMessage.includes("QUEUE_FULL") || errorMessage.includes("503");
              const delay = queueFull ? 10000 : Math.pow(2, retryCount) * 1000;
              logger.warn(
                `Retrying photo upload (${retryCount + 1}/${MAX_RETRIES}) in ${delay}ms`,
                { fileName: file.name, reason: errorMessage.substring(0, 60) },
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              return uploadPhotoWithRetry(file, fileIndex, retryCount + 1);
            }

            failedPhotos.push({ file, error: errorMessage });
            return { success: false };
          }
        };

        let firstPhotoUrl: string | undefined;

        for (let i = 0; i < photoFiles.length; i += BATCH_SIZE) {
          const batch = photoFiles.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map((file, batchIndex) =>
            uploadPhotoWithRetry(file, i + batchIndex),
          );
          const batchResults = await Promise.all(batchPromises);

          batchResults.forEach((result) => {
            if (result.success) {
              successCount++;
              if (!firstPhotoUrl && result.url) {
                firstPhotoUrl = result.url;
              }
              setImportProgress((prev) => ({ ...prev, successCount }));
            } else {
              failCount++;
              setImportProgress((prev) => ({ ...prev, failCount }));
            }
          });

          if (photoFiles.length > 10) {
            const progress = Math.round(
              ((i + batch.length) / photoFiles.length) * 100,
            );
            logger.info(
              `Photo upload progress: ${i + batch.length}/${photoFiles.length} (${progress}%)`,
              {
                success: successCount,
                failed: failCount,
              },
            );
          }
        }

        setImportProgress((prev) => ({ ...prev, isComplete: true }));
        logger.info("Photo import complete", {
          albumTitle: albumData.title,
          successCount,
          failCount,
          totalPhotos: photoFiles.length,
        });

        if (successCount > 0) {
          if (firstPhotoUrl) {
            try {
              await apiService.updateAlbum(createdAlbum.id, {
                coverPhotoUrl: firstPhotoUrl,
              });
            } catch (updateError) {
              logger.warn(
                "Failed to update album cover photo after import",
                updateError,
              );
            }
          }

          await refetch();
          setImportModalOpen(false);
          if (failCount > 0) {
            logger.warn(`Album import completed with ${failCount} failures`, {
              albumId: createdAlbum.id,
              albumTitle: createdAlbum.title,
              failedPhotos: failedPhotos.map((f) => ({
                name: f.file.name,
                size: f.file.size,
                error: f.error,
              })),
            });
            showToast(
              `Album "${createdAlbum.title}" imported with ${successCount} photos. ${failCount} photos failed to upload.`,
            );
          } else {
            showToast(
              `Album "${createdAlbum.title}" imported successfully with ${successCount} photos.`,
            );
          }
          setActiveTab("queue");
        } else {
          logger.error(
            `All ${photoFiles.length} photos failed to upload for album "${createdAlbum.title}"`,
            {
              albumId: createdAlbum.id,
              failedPhotos: failedPhotos.map((f) => ({
                name: f.file.name,
                error: f.error,
              })),
            },
          );
          try {
            await deleteAlbumMutation.mutateAsync(createdAlbum.id);
          } catch (deleteError) {
            logger.error(
              "Failed to clean up album after photo import failure",
              deleteError instanceof Error ? deleteError : undefined,
            );
          }
          showToast(
            `Error: Failed to import any photos. Album creation was rolled back.`,
          );
        }
      } catch (error) {
        logger.error(
          "Import failed",
          error instanceof Error ? error : undefined,
          { albumTitle: albumData.title },
        );

        // Enhanced error logging for debugging
        logger.error("[Import] Full error details:", error);
        if (error && typeof error === "object" && "response" in error) {
          logger.error(
            "[Import] Response data:",
            (error as any).response?.data,
          );
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setImportProgress((prev) => ({ ...prev, isComplete: true }));
        showToast(
          `Error: Could not import album. ${errorMessage}. Check console for details.`,
        );
      }
    },
    [showToast, createAlbumMutation, deleteAlbumMutation, refetch],
  );

  const handleDeleteRequest = useCallback(
    (albumId: string, albumTitle: string) => {
      if (!canManageAll && !canManageOwn) return;
      logger.debug("Album delete requested", { albumId, albumTitle });
      setAlbumToDelete({ id: albumId, title: albumTitle });
      setIsDeleteModalOpen(true);
    },
    [canManageAll, canManageOwn],
  );

  const confirmDeleteAlbum = useCallback(async () => {
    if (albumToDelete) {
      try {
        logger.info("Deleting single album", {
          albumId: albumToDelete.id,
          title: albumToDelete.title,
        });
        await deleteAlbumMutation.mutateAsync(albumToDelete.id);
        showToast(`Album "${albumToDelete.title}" deleted.`);
        logger.info("Album deleted successfully", {
          albumId: albumToDelete.id,
        });
      } catch (error) {
        logger.error(
          "Failed to delete album",
          error instanceof Error ? error : undefined,
          { albumId: albumToDelete.id },
        );
        showToast(`Error: Could not delete album.`);
      } finally {
        setIsDeleteModalOpen(false);
        setAlbumToDelete(null);
      }
    } else if (selectedAlbumIds.size > 0) {
      try {
        logger.info("Bulk deleting albums", {
          count: selectedAlbumIds.size,
          albumIds: Array.from(selectedAlbumIds),
        });
        await Promise.all(
          Array.from(selectedAlbumIds).map((id: string) =>
            deleteAlbumMutation.mutateAsync(id),
          ),
        );
        showToast(`${selectedAlbumIds.size} albums deleted.`);
        logger.info("Bulk delete completed successfully");
        exitSelectionMode();
      } catch (error) {
        logger.error(
          "Failed to delete selected albums",
          error instanceof Error ? error : undefined,
        );
        showToast(`Error: Could not delete all selected albums.`);
      } finally {
        setIsDeleteModalOpen(false);
      }
    }
  }, [
    albumToDelete,
    selectedAlbumIds,
    deleteAlbumMutation,
    showToast,
    exitSelectionMode,
  ]);

  const handleBulkDeleteRequest = useCallback(() => {
    if (selectedAlbumIds.size === 0) return;
    logger.debug("Bulk delete requested", { count: selectedAlbumIds.size });
    setAlbumToDelete(null);
    setIsDeleteModalOpen(true);
  }, [selectedAlbumIds]);

  const handleExport = useCallback(() => {
    logger.info("Export requested", { count: selectedCount });
    exportAlbums(selectedAlbumIds);
    showToast(`${selectedCount} albums exported to CSV.`);
  }, [exportAlbums, selectedAlbumIds, selectedCount, showToast]);

  const handleSelectAlbum = useCallback((album: Album) => {
    logger.debug("Album selected", { albumId: album.id, title: album.title });
    setSelectedAlbum(album);
  }, []);

  const handleOpenImport = useCallback(() => {
    logger.info("Import modal opened");
    setImportModalOpen(true);
  }, []);

  // Album card renderer for Virtuoso
  const albumCardRenderer = useCallback(
    (_: number, album: Album) => {
      const photographerName =
        safePhotographers.find((p) => p.id === album.photographerId)?.name ||
        "Unknown";
      return (
        <AlbumCard
          key={album.id}
          album={album}
          photographerName={photographerName}
          onSelect={() => handleSelectAlbum(album)}
          onDelete={() => handleDeleteRequest(album.id, album.title)}
          onToggleSelection={() => toggleAlbumSelection(album.id)}
          isSelected={selectedAlbumIds.has(album.id)}
          isSelectionMode={isSelectionMode}
        />
      );
    },
    [
      safePhotographers,
      handleSelectAlbum,
      handleDeleteRequest,
      toggleAlbumSelection,
      selectedAlbumIds,
      isSelectionMode,
    ],
  );

  if (selectedAlbum) {
    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
              <Spinner />
            </div>
          }
        >
          <AlbumEditor
            albumId={selectedAlbum.id}
            onBack={() => {
              logger.debug("Returning to album list from detail view");
              setSelectedAlbum(null);
            }}
            showToast={showToast}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <div className="animate-fadeIn pb-16 sm:pb-20">
      {/* Header Section */}
      <PageHeader
        title="Album Workflow"
        subtitle="Manage photoshoot sessions, import new media, and publish to kiosks."
        actions={
          (canManageOwn || canManageAll) && (
            <button
              onClick={handleOpenImport}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 sm:py-2.5 md:py-3 px-6 sm:px-8 rounded-lg sm:rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 w-full sm:w-auto text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Import new album"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Import New</span>
            </button>
          )
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 md:mb-8 max-w-3xl">
        <StatBadge
          label="Queue"
          value={kpiStats.queue}
          color="bg-amber-500 text-amber-600 dark:text-amber-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatBadge
          label="Live"
          value={kpiStats.live}
          color="bg-green-500 text-green-600 dark:text-green-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatBadge
          label="Today"
          value={kpiStats.today}
          color="bg-blue-500 text-blue-600 dark:text-blue-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Bulk Selection Toolbar */}
      <BulkSelectionToolbar
        selectedCount={selectedCount}
        totalCount={allAlbums.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onDelete={handleBulkDeleteRequest}
        onExport={handleExport}
        isSelectionMode={isSelectionMode}
        onExitSelectionMode={exitSelectionMode}
      />

      {/* Sticky Filter Bar */}
      <div className="sticky top-4 z-20 glass-panel rounded-lg sm:rounded-xl md:rounded-2xl mb-5 sm:mb-6 md:mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 sm:gap-4 p-2 sm:p-2.5">
          {/* Tabs */}
          <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1 sm:p-1.5 rounded-lg sm:rounded-xl w-full lg:w-auto overflow-x-auto border border-white/10">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex-1 lg:flex-none px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-md sm:rounded-lg font-semibold sm:font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === "queue" ? "glass-button bg-white/20 dark:bg-white/10 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/5"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              aria-label="View queue albums"
            >
              <span>Queue</span>
              {kpiStats.queue > 0 && (
                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px]">
                  {kpiStats.queue}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 lg:flex-none px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-md sm:rounded-lg font-semibold sm:font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === "live" ? "glass-button bg-white/20 dark:bg-white/10 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/5"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              aria-label="View live albums"
            >
              <span>Live</span>
              {kpiStats.live > 0 && (
                <span className="bg-green-500/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px]">
                  {kpiStats.live}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 lg:flex-none px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-md sm:rounded-lg font-semibold sm:font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === "all" ? "glass-button bg-white/20 dark:bg-white/10 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/5"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              aria-label="View all albums"
            >
              All
            </button>
          </div>

          {/* Search, Sort, Filter & Selection */}
          <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto flex-wrap">
            <div className="relative flex-grow lg:flex-grow-0 group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search albums..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full lg:w-56 xl:w-64 pl-8 sm:pl-10 glass-input rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                aria-label="Search albums"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Clear search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="h-6 sm:h-8 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1 hidden lg:block"></div>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => {
                  logger.debug("Sort order changed", {
                    sortOrder: e.target.value,
                  });
                  setSortOrder(e.target.value);
                }}
                className="appearance-none glass-input rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 pr-7 sm:pr-8 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer"
                aria-label="Sort albums"
              >
                <option
                  value="date-desc"
                  className="bg-white dark:bg-slate-800"
                >
                  Newest First
                </option>
                <option value="date-asc" className="bg-white dark:bg-slate-800">
                  Oldest First
                </option>
                <option
                  value="title-asc"
                  className="bg-white dark:bg-slate-800"
                >
                  Title A-Z
                </option>
                <option
                  value="title-desc"
                  className="bg-white dark:bg-slate-800"
                >
                  Title Z-A
                </option>
              </select>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            <button
              onClick={() => {
                logger.debug("Filter panel toggled", {
                  isOpen: !isFilterPanelOpen,
                });
                setIsFilterPanelOpen(!isFilterPanelOpen);
              }}
              className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all border relative ${isFilterPanelOpen || hasFilters ? "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" : "bg-transparent text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              title="Advanced Filters"
              aria-label="Toggle advanced filters"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {hasFilters && !isFilterPanelOpen && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
              )}
            </button>
            <div className="h-6 sm:h-8 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1 hidden lg:block"></div>
            <button
              onClick={toggleSelectionMode}
              className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all border ${isSelectionMode ? "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" : "bg-transparent text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              title={
                isSelectionMode
                  ? "Exit Selection Mode"
                  : "Select Multiple Albums"
              }
              aria-label={
                isSelectionMode ? "Exit selection mode" : "Enter selection mode"
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={
                    isSelectionMode
                      ? "M6 18L18 6M6 6l12 12"
                      : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  }
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        <FilterPanel
          isOpen={isFilterPanelOpen}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedPhotographer={selectedPhotographer}
          onPhotographerChange={setSelectedPhotographer}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          photographers={safePhotographers}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeletonGrid />
      ) : allAlbums.length > 0 ? (
        <>
          {(debouncedSearchTerm || hasFilters) && (
            <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Found{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {allAlbums.length}
              </span>{" "}
              {allAlbums.length === 1 ? "album" : "albums"}
              {debouncedSearchTerm && ` matching "${debouncedSearchTerm}"`}
            </div>
          )}
          <div className="h-[calc(100vh-320px)] min-h-[500px] w-full">
            <VirtuosoGrid
              style={{ height: "100%", width: "100%" }}
              data={allAlbums}
              components={{
                Item: ItemContainer,
                List: ListContainer,
              }}
              itemContent={albumCardRenderer}
            />
          </div>
        </>
      ) : (
        <EmptyState
          activeTab={activeTab}
          searchTerm={debouncedSearchTerm}
          hasFilters={hasFilters}
          canImport={canManageOwn || canManageAll}
          onImport={handleOpenImport}
          onClearFilters={clearFilters}
        />
      )}

      <ImportAlbumModal
        isOpen={isImportModalOpen}
        onClose={() => {
          logger.debug("Import modal closed");
          setImportModalOpen(false);
        }}
        onImport={handleImportComplete}
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
        statusText={importProgress.statusText}
        onClose={() => setIsProgressModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteAlbum}
        title={albumToDelete ? "Delete Album" : "Bulk Delete Albums"}
        message={
          albumToDelete ? (
            <>
              Are you sure you want to delete{" "}
              <strong>"{albumToDelete.title}"</strong>? This cannot be undone.
            </>
          ) : (
            <>
              Are you sure you want to delete{" "}
              <strong>{selectedAlbumIds.size}</strong> albums? This cannot be
              undone.
            </>
          )
        }
        confirmButtonText="Delete Permanently"
        confirmButtonVariant="danger"
      />
    </div>
  );
};

export default Albums;
