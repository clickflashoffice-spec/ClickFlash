import React, { memo, useMemo, useCallback, useRef, useState, useEffect } from "react";
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
          data-testid="filmstrip-photo"
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
  onSetAsCover?: (id: string) => void;
  isCover?: boolean;
}

const FilmstripThumbnailItem: React.FC<FilmstripThumbnailItemProps> = ({
  photo,
  isActive,
  isSelected,
  isDirty,
  edit,
  onSetActivePhoto,
  onToggleSelection,
  onSetAsCover,
  isCover,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);

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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);

  const handleSetAsCover = useCallback(() => {
    onSetAsCover?.(photo.id);
    handleCloseContextMenu();
  }, [onSetAsCover, photo.id, handleCloseContextMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        handleCloseContextMenu();
      }
    };
    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContextMenu, handleCloseContextMenu]);

  return (
    <>
      <div className="relative" onContextMenu={handleContextMenu}>
        {isCover && (
          <div className="absolute -top-1 -left-1 z-10 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            COVER
          </div>
        )}
        <FilmstripThumbnail
          photo={photo}
          isActive={isActive}
          isSelected={isSelected}
          isDirty={isDirty}
          edit={edit}
          onClick={handleClick}
          onToggleSelection={handleToggleSelection}
        />
      </div>

      {/* P3-D4 Fix: Context menu for "Set as Cover" */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
        >
          <button
            onClick={handleSetAsCover}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-slate-200"
          >
            <span className="text-yellow-500">⭐</span>
            Set as Cover
          </button>
        </div>
      )}
    </>
  );
};

// --- Virtual Filmstrip Scroller ---
// Renders only the visible window of thumbnails to keep DOM count low.
// Item width (w-32 = 128px) + gap (gap-2 = 8px) = ITEM_STRIDE 136px.
// Overscan of 3 items on each side prevents blank flicker during fast scrolls.
const ITEM_STRIDE = 136; // px per item slot
const OVERSCAN = 3;

interface VirtualScrollerProps {
  photos: Photo[];
  activePhotoId: string | null;
  selectedPhotoIds: Set<string>;
  dirtyPhotoIds: Set<string>;
  edits: Record<string, ManualEdits>;
  onSetActivePhoto: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
}

const VirtualFilmstripScroller: React.FC<VirtualScrollerProps> = ({
  photos,
  activePhotoId,
  selectedPhotoIds,
  dirtyPhotoIds,
  edits,
  onSetActivePhoto,
  onToggleSelection,
  onContextMenu,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);

    const onScroll = () => setScrollLeft(el.scrollLeft);
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Scroll the active photo into view when it changes.
  useEffect(() => {
    if (!activePhotoId || !scrollRef.current) return;
    const idx = photos.findIndex((p) => p.id === activePhotoId);
    if (idx < 0) return;
    const itemLeft = idx * ITEM_STRIDE + 16; // 16px = px-4 left padding
    const el = scrollRef.current;
    const visibleRight = el.scrollLeft + el.clientWidth;
    if (itemLeft < el.scrollLeft || itemLeft + 128 > visibleRight) {
      el.scrollTo({ left: itemLeft - el.clientWidth / 2, behavior: "smooth" });
    }
  }, [activePhotoId, photos]);

  const totalWidth = photos.length * ITEM_STRIDE + 32; // +32 for px-4 padding
  const startIdx = Math.max(0, Math.floor((scrollLeft - 16) / ITEM_STRIDE) - OVERSCAN);
  const visibleCount = Math.ceil(containerWidth / ITEM_STRIDE) + OVERSCAN * 2;
  const endIdx = Math.min(photos.length, startIdx + visibleCount);

  const visiblePhotos = photos.slice(startIdx, endIdx);

  return (
    <div
      ref={scrollRef}
      className="flex-1 relative overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300"
      role="listbox"
      aria-label="Photo thumbnails"
      aria-multiselectable="true"
    >
      {/* Full-width spacer to give the scrollbar the correct total range */}
      <div style={{ width: totalWidth, height: "100%", position: "relative" }}>
        {/* Left spacer fills the gap before the first rendered item */}
        {startIdx * ITEM_STRIDE > 0 && (
          <div style={{ display: "inline-block", width: startIdx * ITEM_STRIDE + 16 }} />
        )}
        {/* Visible items rendered inline — no absolute positioning needed */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: startIdx === 0 ? 16 : 0,
            paddingRight: endIdx === photos.length ? 16 : 0,
            verticalAlign: "top",
            height: "100%",
          }}
        >
          {visiblePhotos.map((p) => (
            <div
              key={p.id}
              onContextMenu={onContextMenu ? (e) => onContextMenu(e, p) : undefined}
            >
              <FilmstripThumbnailItem
                photo={p}
                isActive={activePhotoId === p.id}
                isSelected={selectedPhotoIds.has(p.id)}
                isDirty={dirtyPhotoIds.has(p.id)}
                edit={edits[p.id]}
                onSetActivePhoto={onSetActivePhoto}
                onToggleSelection={onToggleSelection}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface FilmstripProps {
  photos: Photo[];
  activePhotoId: string | null;
  selectedPhotoIds: Set<string>;
  dirtyPhotoIds: Set<string>;
  edits: Record<string, ManualEdits>;
  coverPhotoId?: string | null;
  onSetActivePhoto: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSetCover?: (photo: Photo) => void;
}

const FilmstripComponent: React.FC<FilmstripProps> = ({
  photos,
  activePhotoId,
  selectedPhotoIds,
  dirtyPhotoIds,
  edits,
  coverPhotoId: _coverPhotoId,
  onSetActivePhoto,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onSetCover,
}) => {
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; photo: Photo } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, photo: Photo) => {
    if (!onSetCover) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, photo });
  }, [onSetCover]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);
  const handleSelectAll = useCallback(() => onSelectAll(), [onSelectAll]);
  const handleDeselectAll = useCallback(() => onDeselectAll(), [onDeselectAll]);

  return (
    <div
      data-testid="filmstrip"
      className="h-full flex flex-col pt-2 overflow-hidden"
      role="region"
      aria-label="Photo filmstrip"
    >
      {/* Selection Toolbar */}
      <div className="flex items-center gap-2 px-4 pb-2 border-b border-gray-200 mb-2">
        <span
          data-testid="selected-count"
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

      <VirtualFilmstripScroller
        photos={photos}
        activePhotoId={activePhotoId}
        selectedPhotoIds={selectedPhotoIds}
        dirtyPhotoIds={dirtyPhotoIds}
        edits={edits}
        onSetActivePhoto={onSetActivePhoto}
        onToggleSelection={onToggleSelection}
        onContextMenu={onSetCover ? handleContextMenu : undefined}
      />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => {
              onSetCover?.(contextMenu.photo);
              closeContextMenu();
            }}
          >
            <span>🖼️</span> Set as Album Cover
          </button>
        </div>
      )}
    </div>
  );
};

// Memoize the entire filmstrip
const Filmstrip = memo(FilmstripComponent);
Filmstrip.displayName = "Filmstrip";

export { Filmstrip };
