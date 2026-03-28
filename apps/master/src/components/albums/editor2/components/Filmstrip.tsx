import React, { memo, useMemo, useCallback } from "react";
import { Photo, ManualEdits } from "@/types/shared";
import { Wand2 } from "lucide-react";
import { getPhotoStyle, INITIAL_EDITS, isEdited } from "@/utils/styleUtils";
import { EditorFilters } from "../EditorFilters";
import { getOrientationTransform } from "@/utils/exifOrientation";

// Memoized thumbnail component for performance
interface FilmstripThumbnailProps {
  photo: Photo;
  isActive: boolean;
  isSelected: boolean;
  isDirty: boolean;
  edit: ManualEdits | undefined;
  onClick: () => void;
  onToggleSelection: (e: React.MouseEvent) => void;
}

const FilmstripThumbnail = memo<FilmstripThumbnailProps>(
  ({
    photo,
    isActive,
    isSelected,
    isDirty,
    edit,
    onClick,
    onToggleSelection,
  }) => {
    const photoStyle = useMemo(() => {
      const photoEdits = edit || photo.manualEdits || { ...INITIAL_EDITS };
      const style = getPhotoStyle(
        photoEdits,
        false,
        undefined,
        undefined,
        photo.id,
      );
      const orientationTransform = getOrientationTransform(
        photo.orientation || photo.metadata?.orientation,
      );
      const finalTransform = orientationTransform
        ? `${style.transform || ""} ${orientationTransform}`.trim()
        : style.transform;
      return {
        filter: style.filter,
        transform: finalTransform,
      };
    }, [
      edit,
      photo.manualEdits,
      photo.id,
      photo.orientation,
      photo.metadata?.orientation,
    ]);

    const hasFilters = useMemo(() => {
      const photoEdits = edit || photo.manualEdits || { ...INITIAL_EDITS };
      return !!(photoEdits.temperature || photoEdits.tint);
    }, [edit, photo.manualEdits]);

    const qualityFlags = useMemo(() => {
      let flags: string[] = [];
      try {
        if (
          typeof photo.quality_flags === "string" &&
          photo.quality_flags.startsWith("[")
        ) {
          flags = JSON.parse(photo.quality_flags);
        } else if (Array.isArray(photo.quality_flags)) {
          flags = photo.quality_flags;
        }
      } catch {
        // Silently ignore invalid quality_flags
      }
      return flags;
    }, [photo.quality_flags]);

    const isPhotoEdited = useMemo(
      () => isEdited(edit || photo.manualEdits),
      [edit, photo.manualEdits],
    );

    return (
      <div className="relative group">
        <button
          onClick={onClick}
          className={`relative w-32 h-32 flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
            isActive
              ? "border-blue-500 ring-2 ring-blue-500/50"
              : "border-transparent opacity-70 hover:opacity-100"
          } ${isSelected ? "opacity-100 ring-2 ring-blue-400" : ""}`}
        >
          <img
            src={photo.thumbnailUrl || photo.previewUrl || photo.url}
            className="w-full h-full object-cover"
            alt={`Photo ${photo.id.slice(0, 8)}`}
            loading="lazy"
            style={photoStyle}
          />
          {hasFilters && (
            <EditorFilters
              photoId={photo.id}
              temperature={(edit || photo.manualEdits)?.temperature || 0}
              tint={(edit || photo.manualEdits)?.tint || 0}
            />
          )}
          {/* Status Badges */}
          <div className="absolute top-1 left-1 flex flex-col gap-1">
            {photo.cullingStatus === "Selected" && (
              <div
                className="bg-blue-500 text-white p-0.5 rounded shadow-sm text-[10px] flex items-center justify-center"
                aria-label="Selected"
              >
                ⭐
              </div>
            )}
            {photo.cullingStatus === "Rejected" && (
              <div
                className="bg-rose-500 text-white p-0.5 rounded shadow-sm text-[10px] flex items-center justify-center"
                aria-label="Rejected"
              >
                🗑️
              </div>
            )}
            {isPhotoEdited && (
              <div
                className="bg-amber-500 text-white p-0.5 rounded shadow-sm text-[10px] flex items-center justify-center"
                title="Has manual edits"
                aria-label="Has edits"
              >
                <Wand2 className="w-2.5 h-2.5" />
              </div>
            )}
            {qualityFlags.map((f, idx) => (
              <div
                key={`flag-${idx}`}
                className="bg-red-500/90 backdrop-blur-sm px-1 py-0.5 rounded text-white text-[9px] font-bold shadow-sm uppercase tracking-wider flex items-center justify-center"
                title={`Quality Alert: ${f}`}
                aria-label={`Quality issue: ${f}`}
              >
                ⚠️ {f}
              </div>
            ))}
          </div>
          {isDirty && (
            <div
              className="absolute top-8 right-1 w-2 h-2 bg-yellow-400 rounded-full shadow-sm border border-black/20"
              aria-label="Unsaved changes"
            />
          )}
        </button>

        {/* Selection Checkbox */}
        <button
          onClick={onToggleSelection}
          title={isSelected ? "Deselect photo" : "Select photo"}
          aria-label={isSelected ? "Deselect photo" : "Select photo"}
          aria-pressed={isSelected}
          className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-all z-10 ${
            isSelected
              ? "bg-blue-600 border-blue-600 text-white scale-110"
              : "bg-gray-400/50 text-transparent opacity-0 group-hover:opacity-100 hover:bg-gray-500/60"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  },
);

FilmstripThumbnail.displayName = "FilmstripThumbnail";

// Wrapper component to handle callbacks without breaking hooks rules
interface FilmstripThumbnailItemProps {
  photo: Photo;
  isActive: boolean;
  isSelected: boolean;
  isDirty: boolean;
  edit: ManualEdits | undefined;
  onSetActivePhoto: (id: string) => void;
  onToggleSelection: (id: string) => void;
}

const FilmstripThumbnailItem: React.FC<FilmstripThumbnailItemProps> = ({
  photo,
  isActive,
  isSelected,
  isDirty,
  edit,
  onSetActivePhoto,
  onToggleSelection,
}) => {
  const handleClick = useCallback(() => {
    onSetActivePhoto(photo.id);
  }, [onSetActivePhoto, photo.id]);

  const handleToggleSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelection(photo.id);
    },
    [onToggleSelection, photo.id],
  );

  return (
    <FilmstripThumbnail
      photo={photo}
      isActive={isActive}
      isSelected={isSelected}
      isDirty={isDirty}
      edit={edit}
      onClick={handleClick}
      onToggleSelection={handleToggleSelection}
    />
  );
};

interface FilmstripProps {
  photos: Photo[];
  activePhotoId: string | null;
  selectedPhotoIds: Set<string>;
  dirtyPhotoIds: Set<string>;
  edits: Record<string, ManualEdits>;
  onSetActivePhoto: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const FilmstripComponent: React.FC<FilmstripProps> = ({
  photos,
  activePhotoId,
  selectedPhotoIds,
  dirtyPhotoIds,
  edits,
  onSetActivePhoto,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
}) => {
  const handleSelectAll = useCallback(() => onSelectAll(), [onSelectAll]);
  const handleDeselectAll = useCallback(() => onDeselectAll(), [onDeselectAll]);

  return (
    <div
      className="h-full flex flex-col pt-2 overflow-hidden"
      role="region"
      aria-label="Photo filmstrip"
    >
      {/* Selection Toolbar */}
      <div className="flex items-center gap-2 px-4 pb-2 border-b border-gray-200 mb-2">
        <span
          className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-2"
          aria-live="polite"
        >
          {selectedPhotoIds.size} Selected
        </span>
        <button
          onClick={handleSelectAll}
          className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors"
          aria-label="Select all photos"
        >
          Select All
        </button>
        <button
          onClick={handleDeselectAll}
          disabled={selectedPhotoIds.size === 0}
          className="px-2 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200 transition-colors disabled:opacity-30"
          aria-label="Deselect all photos"
        >
          Deselect All
        </button>
      </div>

      <div
        className="flex-1 flex items-center gap-2 px-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300"
        role="listbox"
        aria-label="Photo thumbnails"
        aria-multiselectable="true"
      >
        {photos.map((p) => (
          <FilmstripThumbnailItem
            key={p.id}
            photo={p}
            isActive={activePhotoId === p.id}
            isSelected={selectedPhotoIds.has(p.id)}
            isDirty={dirtyPhotoIds.has(p.id)}
            edit={edits[p.id]}
            onSetActivePhoto={onSetActivePhoto}
            onToggleSelection={onToggleSelection}
          />
        ))}
      </div>
    </div>
  );
};

// Memoize the entire filmstrip
const Filmstrip = memo(FilmstripComponent);
Filmstrip.displayName = "Filmstrip";

export { Filmstrip };
