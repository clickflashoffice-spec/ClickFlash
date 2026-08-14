import React, { useRef, useEffect, memo, useCallback } from "react";
import { Check, Wand2 } from "lucide-react";
import { Photo } from "../../../types";
import {
  getPhotoStyle,
  INITIAL_EDITS,
  isEdited,
} from "../../../utils/styleUtils";
import { motion, AnimatePresence } from "framer-motion";

interface FilmstripProps {
  photos: Photo[];
  activeIndex: number;
  selectedIds: Set<string>;
  onPhotoClick: (index: number) => void;
  onSelectToggle: (photoId: string) => void;
  onMultiSelect: (startIndex: number, endIndex: number) => void;
}

interface FilmstripThumbnailProps {
  photo: Photo;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onSelectToggle: () => void;
}

const FilmstripThumbnail = memo<FilmstripThumbnailProps>(
  ({ photo, index, isActive, isSelected, onClick, onSelectToggle }) => {
    const thumbnailStyle = getPhotoStyle({
      ...INITIAL_EDITS,
      ...(photo.manualEdits || {}),
    });
    const hasEdits = isEdited(photo.manualEdits);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: isActive ? 1.05 : 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: isActive ? 1.08 : 1.05, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex-shrink-0 w-20 h-20 mx-1 cursor-pointer transition-shadow ${
          isActive
            ? "ring-2 ring-blue-500 z-10 shadow-lg shadow-blue-500/20"
            : "opacity-70"
        }`}
        onClick={onClick}
      >
        <motion.img
          src={photo.thumbnailUrl || photo.url}
          alt={photo.title || `Photo ${index + 1}`}
          className="w-full h-full object-cover rounded shadow-inner photo-editor-image"
          style={
            {
              "--photo-filter": thumbnailStyle.filter,
              "--photo-transform": thumbnailStyle.transform,
            } as any
          }
          loading="lazy"
        />

        {/* Selection indicator */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle();
          }}
          className={`absolute top-1 left-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-blue-500 border-blue-500"
              : "bg-black/50 border-white/50 hover:bg-black/70"
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Edit indicator */}
        {hasEdits && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
            <Wand2 className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Index number */}
        <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
          {index + 1}
        </div>
      </motion.div>
    );
  },
);

export const Filmstrip: React.FC<FilmstripProps> = ({
  photos,
  activeIndex,
  selectedIds,
  onPhotoClick,
  onSelectToggle,
  onMultiSelect,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const lastShiftClickRef = useRef<number | null>(null);

  // Auto-scroll to active photo
  useEffect(() => {
    if (stripRef.current) {
      const activeElement = stripRef.current.children[
        activeIndex
      ] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeIndex]);

  const handlePhotoClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastShiftClickRef.current !== null) {
        // Multi-select range
        onMultiSelect(lastShiftClickRef.current, index);
      } else {
        lastShiftClickRef.current = index;
        onPhotoClick(index);
      }
    },
    [onMultiSelect, onPhotoClick],
  );

  if (photos.length === 0) {
    return (
      <div className="h-24 bg-slate-800 border-t border-slate-700 flex items-center justify-center">
        <p className="text-slate-500 text-sm">No photos in album</p>
      </div>
    );
  }

  return (
    <div className="h-28 bg-slate-800 border-t border-slate-700 flex flex-col">
      {/* Info bar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs text-slate-400">
        <span>{photos.length} photos</span>
        <span>{selectedIds.size} selected</span>
      </div>

      {/* Thumbnails */}
      <div
        ref={stripRef}
        className="flex-1 flex items-center overflow-x-auto px-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {photos.map((photo, index) => (
            <FilmstripThumbnail
              key={photo.id}
              photo={photo}
              index={index}
              isActive={index === activeIndex}
              isSelected={selectedIds.has(photo.id)}
              onClick={(e) => handlePhotoClick(index, e)}
              onSelectToggle={() => onSelectToggle(photo.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Filmstrip;
