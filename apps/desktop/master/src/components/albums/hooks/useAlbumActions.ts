import { useCallback } from "react";
import { Album, Photo, ManualEdits } from "../../../types";
import { apiService } from "../../../services/apiService";
import { photoService } from "../../../services/api/photoService";
import { logger } from "../../../utils/logger";
import { INITIAL_EDITS } from "../../../utils/styleUtils";
import { AlbumWithPhotos } from "../types";

export const useAlbumActions = (
  state: {
    album: AlbumWithPhotos | null;
    setAlbum: React.Dispatch<React.SetStateAction<AlbumWithPhotos | null>>;
    pristineAlbum: AlbumWithPhotos | null;
    setPristineAlbum: React.Dispatch<
      React.SetStateAction<AlbumWithPhotos | null>
    >;
    setSaveStatus: React.Dispatch<
      React.SetStateAction<"idle" | "modified" | "saving" | "saved" | "error">
    >;
    activePhoto: Photo | null;
    activePhotoIndex: number;
    setActivePhotoIndex: React.Dispatch<React.SetStateAction<number>>;
    selectedPhotoIds: Set<string>;
    setSelectedPhotoIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  },
  showToast: (message: string) => void,
) => {
  const {
    album,
    setAlbum,
    pristineAlbum,
    setPristineAlbum,
    setSaveStatus,
    activePhoto,
    activePhotoIndex,
    setActivePhotoIndex,
    selectedPhotoIds,
    setSelectedPhotoIds,
  } = state;

  const updateAlbumState = useCallback(
    (recipe: (draft: AlbumWithPhotos) => void) => {
      setAlbum((prev: AlbumWithPhotos | null) => {
        if (!prev) return null;
        const next = { ...prev };
        next.photos = [...(prev.photos || [])];
        recipe(next);
        return next;
      });
      setSaveStatus("modified");
    },
    [setAlbum, setSaveStatus],
  );

  const handleSaveChanges = async () => {
    if (!album || !album.photos) return;
    const currentPhotos = album.photos;
    setSaveStatus("saving");
    try {
      const dirtyPhotos = currentPhotos.filter((photo: Photo, i: number) => {
        const pristine = pristineAlbum?.photos?.[i];
        return !pristine || photo !== pristine;
      });

      if (dirtyPhotos.length > 0) {
        logger.info(`Saving ${dirtyPhotos.length} modified photos in batch...`);
        await photoService.batchSavePhotos(dirtyPhotos);
      }

      const albumId = album.id as string;
      await apiService.updateAlbum(albumId, {
        title: album.title as string,
        date: album.date as string,
        photographerId: album.photographerId as string,
        categories: album.categories,
        coverPhotoUrl: album.coverPhotoUrl,
      } as Partial<Album>);

      setPristineAlbum({ ...album, photos: [...currentPhotos] });
      setSaveStatus("saved");
      if (dirtyPhotos.length > 0) {
        showToast(`Saved changes for ${dirtyPhotos.length} photos.`);
      }
    } catch (error) {
      setSaveStatus("error");
      showToast("Failed to save changes.");
      logger.error("handleSaveChanges: Failed to persist edits", error);
      throw error;
    }
  };

  const handleManualEditChange = (updates: Partial<ManualEdits>) => {
    const idsToUpdate = activePhoto ? new Set([activePhoto.id]) : new Set();
    if (idsToUpdate.size === 0) return;

    const validatedUpdates: Partial<ManualEdits> = {};
    Object.keys(updates).forEach((key) => {
      const value = updates[key as keyof ManualEdits];
      if (typeof value === "number") {
        let min = -100;
        let max = 100;
        if (key === "hueRotate") {
          min = 0;
          max = 360;
        } else if (key === "rotate") {
          min = -180;
          max = 180;
        } else if (key === "straighten") {
          min = -45;
          max = 45;
        } else if (
          key === "clarity" ||
          key === "grayscale" ||
          key === "sepia" ||
          key === "invert" ||
          key === "dropShadow"
        ) {
          min = 0;
          max = 100;
        } else if (key === "soften") {
          min = 0;
          max = 20;
        }
        validatedUpdates[key as keyof ManualEdits] = Math.max(
          min,
          Math.min(max, value),
        ) as any;
      } else {
        validatedUpdates[key as keyof ManualEdits] = value as any;
      }
    });

    updateAlbumState((draft: AlbumWithPhotos) => {
      if (!draft.photos) return;
      draft.photos = draft.photos.map((p: Photo) => {
        if (idsToUpdate.has(p.id)) {
          const currentEdits =
            p.manualEdits != null &&
            typeof p.manualEdits === "object" &&
            !Array.isArray(p.manualEdits)
              ? p.manualEdits
              : INITIAL_EDITS;
          return {
            ...p,
            manualEdits: { ...currentEdits, ...validatedUpdates },
          };
        }
        return p;
      });
    });
  };

  const handleQuickRotate = (direction: "left" | "right") => {
    const idsToUpdate = activePhoto ? new Set([activePhoto.id]) : new Set();
    if (idsToUpdate.size === 0) return;
    updateAlbumState((draft) => {
      (draft.photos || []).forEach((p: Photo) => {
        if (idsToUpdate.has(p.id)) {
          const currentEdits =
            p.manualEdits != null &&
            typeof p.manualEdits === "object" &&
            !Array.isArray(p.manualEdits)
              ? p.manualEdits
              : INITIAL_EDITS;
          const currentRotation = currentEdits.rotate || 0;
          p.manualEdits = {
            ...currentEdits,
            rotate: currentRotation + (direction === "left" ? -90 : 90),
          };
        }
      });
    });
  };

  const handleCategorizeSelected = (category: string) => {
    if (selectedPhotoIds.size === 0) return;
    updateAlbumState((draft: AlbumWithPhotos) => {
      (draft.photos || []).forEach((p: Photo) => {
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
    const remainingPhotos = originalPhotos.filter(
      (p) => !selectedPhotoIds.has(p.id),
    );

    let newActiveIndex = 0;
    if (remainingPhotos.length > 0) {
      if (activePhotoId && selectedPhotoIds.has(activePhotoId)) {
        newActiveIndex = Math.min(activePhotoIndex, remainingPhotos.length - 1);
      } else if (activePhotoId) {
        const foundIndex = remainingPhotos.findIndex(
          (p) => p.id === activePhotoId,
        );
        newActiveIndex = foundIndex > -1 ? foundIndex : 0;
      }
    }

    updateAlbumState((draft: AlbumWithPhotos) => {
      draft.photos = remainingPhotos;
    });
    setActivePhotoIndex(newActiveIndex);
    setSelectedPhotoIds(new Set());
  };

  const handleResetEdits = () => {
    const idsToUpdate = activePhoto ? new Set([activePhoto.id]) : new Set();
    if (idsToUpdate.size === 0) return;
    updateAlbumState((draft: AlbumWithPhotos) => {
      (draft.photos || []).forEach((p: Photo) => {
        if (idsToUpdate.has(p.id)) {
          p.manualEdits = { ...INITIAL_EDITS };
        }
      });
    });
  };

  const handleAutoAdjust = () => {
    const idsToUpdate = activePhoto ? new Set([activePhoto.id]) : new Set();
    if (idsToUpdate.size === 0) return;
    updateAlbumState((draft: AlbumWithPhotos) => {
      (draft.photos || []).forEach((p: Photo) => {
        if (idsToUpdate.has(p.id)) {
          const currentEdits =
            p.manualEdits != null &&
            typeof p.manualEdits === "object" &&
            !Array.isArray(p.manualEdits)
              ? p.manualEdits
              : INITIAL_EDITS;
          p.manualEdits = {
            ...currentEdits,
            exposure: Math.min(15, (currentEdits.exposure || 0) + 10),
            contrast: Math.min(20, (currentEdits.contrast || 0) + 8),
            saturate: Math.min(15, (currentEdits.saturate || 0) + 8),
            highlights: Math.min(10, (currentEdits.highlights || 0) + 5),
            shadows: Math.min(15, (currentEdits.shadows || 0) + 8),
          };
        }
      });
    });
    showToast(`Auto-enhanced active photo.`);
  };

  const handlePasteToSelected = (copiedEdits: ManualEdits) => {
    if (selectedPhotoIds.size === 0) return;
    updateAlbumState((draft) => {
      (draft.photos || []).forEach((p: Photo) => {
        if (selectedPhotoIds.has(p.id)) {
          p.manualEdits = { ...INITIAL_EDITS, ...copiedEdits };
        }
      });
    });
    showToast(`Pasted adjustments to ${selectedPhotoIds.size} photos.`);
  };

  return {
    updateAlbumState,
    handleSaveChanges,
    handleManualEditChange,
    handleQuickRotate,
    handleCategorizeSelected,
    confirmDeleteSelected,
    handleResetEdits,
    handleAutoAdjust,
    handlePasteToSelected,
  };
};
