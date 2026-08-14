import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Album } from "../../../types.ts";

interface AlbumCardProps {
  album: Album;
  photographerName: string;
  onSelect: () => void;
  onDelete: () => void;
  onToggleSelection: () => void;
  isSelected: boolean;
  isSelectionMode: boolean;
}

const AlbumCard: React.FC<AlbumCardProps> = React.memo(
  ({
    album,
    photographerName,
    onSelect,
    onDelete,
    onToggleSelection,
    isSelected,
    isSelectionMode,
  }) => {
    const [imgError, setImgError] = useState(false);
    const isDraft = album.status !== "Finalized";

    // FIX: Get the best available image URL for the album cover
    // Try multiple fallbacks: thumbnail -> coverPhoto -> first photo -> placeholder
    const getCoverImageUrl = () => {
      if (album.thumbnailUrl && !imgError) return album.thumbnailUrl;
      if (album.coverPhotoUrl && !imgError) return album.coverPhotoUrl;
      // Try to use first photo from album if available
      if (album.photos && album.photos.length > 0) {
        const firstPhoto = album.photos[0];
        if (firstPhoto.thumbnailUrl) return firstPhoto.thumbnailUrl;
        if (firstPhoto.previewUrl) return firstPhoto.previewUrl;
        if (firstPhoto.url) return firstPhoto.url;
      }
      return null;
    };

    const coverImageUrl = getCoverImageUrl();

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        if (isSelectionMode) {
          e.stopPropagation();
          onToggleSelection();
        } else {
          onSelect();
        }
      },
      [isSelectionMode, onToggleSelection, onSelect],
    );

    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete();
      },
      [onDelete],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick(e as unknown as React.MouseEvent);
        }
      },
      [handleCardClick],
    );

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        data-testid="album-item"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={`
                relative group rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden cursor-pointer glass-card flex flex-col h-full
                ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/50 ring-offset-0 bg-blue-50/10"
                    : "border-white/20 hover:border-blue-400/50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                }
            `}
        aria-label={`${isSelectionMode ? (isSelected ? "Deselect" : "Select") : "View"} album ${album.title} `}
      >
        {isSelectionMode && (
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${isSelected ? "bg-blue-600 border-blue-600" : "bg-white/90 border-slate-400"} `}
            >
              {isSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        )}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
          {imgError || !coverImageUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 mb-2 opacity-20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-[10px] font-medium opacity-40 uppercase tracking-widest">
                No Preview Available
              </span>
            </div>
          ) : (
            <div className="w-full h-full overflow-hidden">
              <motion.img
                src={coverImageUrl}
                alt={album.title}
                className="w-full h-full object-cover object-center"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.7 }}
                onError={() => setImgError(true)}
                loading="lazy"
                style={{ willChange: "transform" }}
              />
            </div>
          )}
          {coverImageUrl && !imgError && (
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
          )}

          <div className="absolute top-3 right-3 z-10">
            {isDraft ? (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-500 text-white shadow-sm backdrop-blur-md border border-white/20 flex items-center gap-1">
                Queue
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-green-500 text-white shadow-sm backdrop-blur-md border border-white/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>{" "}
                Live
              </span>
            )}
          </div>

          {album.roomNumber && (
            <div className="absolute bottom-3 left-3 z-10 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-mono font-bold backdrop-blur-md border border-white/10 shadow-lg">
              #{album.roomNumber}
            </div>
          )}
        </div>
        <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-1.5 sm:mb-2">
              <h3
                className="font-bold text-slate-900 dark:text-white truncate pr-2 flex-1 text-sm sm:text-base leading-snug"
                title={album.title}
              >
                {album.title}
              </h3>
              {!isSelectionMode && (
                <button
                  onClick={handleDeleteClick}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 -mr-2 -mt-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title="Delete Album"
                  aria-label={`Delete album ${album.title} `}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1-1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-100 dark:bg-slate-700/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium">{album.photos?.length || album.numberOfPhotos || 0}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 sm:gap-1 min-w-0 flex-1 ml-2">
              <div className="flex items-center space-x-1 sm:space-x-1.5 max-w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="truncate text-right">{photographerName}</span>
              </div>
              {album.date && (
                <div className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500">
                  {new Date(album.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for better performance
    return (
      prevProps.album.id === nextProps.album.id &&
      prevProps.album.status === nextProps.album.status &&
      prevProps.album.coverPhotoUrl === nextProps.album.coverPhotoUrl &&
      prevProps.photographerName === nextProps.photographerName &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isSelectionMode === nextProps.isSelectionMode
    );
  },
);

AlbumCard.displayName = "AlbumCard";

export default AlbumCard;